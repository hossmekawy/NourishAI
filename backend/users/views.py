import json
import base64
import requests as http_requests
from datetime import date

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import UserProfile, MealLog, WeightLog
from .serializers import UserProfileSerializer, OnboardingSerializer, MealLogSerializer, WeightLogSerializer


# ─── Profile ───────────────────────────────────────────────────────────────────

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)

    if request.method == 'GET':
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    serializer = UserProfileSerializer(profile, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# ─── Settings ──────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def settings_view(request):
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)
    data = request.data

    if 'first_name' in data:
        user.first_name = data['first_name']
    if 'last_name' in data:
        user.last_name = data['last_name']
    if 'password' in data and data['password']:
        user.set_password(data['password'])
    user.save()

    if 'avatar_url' in data:
        profile.avatar_url = data['avatar_url']
        profile.save()

    return Response(UserProfileSerializer(profile).data)


# ─── Onboarding ───────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def onboarding_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    serializer = OnboardingSerializer(profile, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(UserProfileSerializer(profile).data)


# ─── Barcode (Open Food Facts proxy) ──────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def barcode_view(request, barcode):
    url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
    headers = {
        "User-Agent": "NourishAI - Web - Version 1.0 - contact@nourishai.app"
    }
    try:
        resp = http_requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        if data.get('status') == 1:
            product = data.get('product', {})
            nutriments = product.get('nutriments', {})
            return Response({
                "found": True,
                "name": product.get("product_name", "Unknown"),
                "brand": product.get("brands", "Unknown"),
                "image": product.get("image_url", ""),
                "ingredients": product.get("ingredients_text", ""),
                "nutriscore": product.get("nutriscore_grade", "N/A"),
                "calories": nutriments.get("energy-kcal_100g", 0),
                "protein": nutriments.get("proteins_100g", 0),
                "carbs": nutriments.get("carbohydrates_100g", 0),
                "fat": nutriments.get("fat_100g", 0),
                "fiber": nutriments.get("fiber_100g", 0),
                "sugar": nutriments.get("sugars_100g", 0),
                "sodium": nutriments.get("sodium_100g", 0),
                "serving_size": product.get("serving_size", "N/A"),
            })
        else:
            return Response({"found": False, "error": "Product not found."}, status=404)
    except http_requests.exceptions.RequestException as e:
        return Response({"found": False, "error": str(e)}, status=502)


# ─── Meals CRUD ────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def meals_view(request):
    if request.method == 'GET':
        today = date.today()
        meals = MealLog.objects.filter(user=request.user, date=today)
        serializer = MealLogSerializer(meals, many=True)
        return Response(serializer.data)

    # POST — create a new meal
    serializer = MealLogSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(user=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def meal_detail_view(request, meal_id):
    try:
        meal = MealLog.objects.get(id=meal_id, user=request.user)
    except MealLog.DoesNotExist:
        return Response({"error": "Meal not found."}, status=404)

    if request.method == 'DELETE':
        meal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PUT — update meal
    serializer = MealLogSerializer(meal, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# ─── AI: Gemini Food Detection ────────────────────────────────────────────────

GEMINI_API_KEYS = getattr(settings, 'GEMINI_API_KEYS', [])

FOOD_DETECT_PROMPT = """You are a nutrition AI. Analyze this food image and identify all food items visible.
For each food item, return:
- name (in English, also include Arabic name if it's a Middle Eastern/Arabic dish like محشي، كشري، فول، طعمية، etc.)
- emoji (a single emoji that best represents this food)
- estimated_grams (your best guess of the portion size in grams)

Return ONLY valid JSON array, no markdown. Example:
[{"name": "Grilled Chicken Breast", "emoji": "🍗", "estimated_grams": 150}, {"name": "White Rice", "emoji": "🍚", "estimated_grams": 200}]
"""

NUTRITION_CALC_PROMPT = """You are a precise nutrition calculator. Given these food items with their quantities, calculate the nutritional information for each.

Food items: {items}

For each item, return:
- name, emoji, quantity (grams), calories (kcal), protein (g), carbs (g), fat (g)

Also return total calories, protein, carbs, fat for the entire meal.

Return ONLY valid JSON, no markdown:
{{"items": [{{"name": "...", "emoji": "...", "quantity": 150, "calories": 250, "protein": 30, "carbs": 0, "fat": 14}}], "total": {{"calories": 500, "protein": 45, "carbs": 30, "fat": 20}}, "meal_name": "A short descriptive name for this meal", "meal_emoji": "🍽️"}}
"""

TEXT_FOOD_PROMPT = """You are a nutrition AI. The user described food they ate: "{text}"
Identify all food items mentioned (support Arabic food names like كشري، محشي، فول، طعمية، فتة، ملوخية، etc.).

For each food item, return:
- name (in English, include Arabic name in parentheses if applicable)
- emoji (a single emoji that best represents this food)
- estimated_grams (your best guess of a typical serving in grams)

Return ONLY valid JSON array, no markdown:
[{{"name": "Koshari (كشري)", "emoji": "🍜", "estimated_grams": 350}}]
"""


# Models to try in order of preference (only ones with free tier quota)
GEMINI_MODELS = [
    'gemini-2.5-flash',       # 5 RPM, 20 RPD
    'gemini-2.5-flash-lite',  # 10 RPM, 20 RPD
]


def _parse_gemini_response(resp_json):
    """Extract and parse JSON from Gemini response text."""
    text = resp_json['candidates'][0]['content']['parts'][0]['text']
    text = text.strip()
    if text.startswith('```'):
        text = text.split('\n', 1)[1] if '\n' in text else text[3:]
    if text.endswith('```'):
        text = text[:-3]
    text = text.strip()
    return json.loads(text)


def _call_gemini_text(prompt):
    """Call Gemini API with text-only prompt. Tries multiple models and keys."""
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    
    last_error = "No API keys configured."
    for model in GEMINI_MODELS:
        for key in GEMINI_API_KEYS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            try:
                resp = http_requests.post(url, json=payload, timeout=30)
                if resp.status_code == 429:
                    last_error = f"Quota exceeded for {model}, trying next..."
                    continue
                if resp.status_code != 200:
                    detail = resp.json().get('error', {}).get('message', resp.text[:200])
                    last_error = f"Gemini error ({resp.status_code}): {detail}"
                    continue
                return _parse_gemini_response(resp.json())
            except json.JSONDecodeError:
                last_error = "AI returned invalid response. Please try again."
                continue
            except Exception as e:
                last_error = str(e)
                continue

    raise Exception(last_error)


def _call_gemini_vision(prompt, image_base64, mime_type="image/jpeg"):
    """Call Gemini API with image + text. Tries multiple models and keys."""
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": mime_type, "data": image_base64}}
            ]
        }]
    }
    
    last_error = "No API keys configured."
    for model in GEMINI_MODELS:
        for key in GEMINI_API_KEYS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            try:
                resp = http_requests.post(url, json=payload, timeout=30)
                if resp.status_code == 429:
                    last_error = f"Quota exceeded for {model}, trying next..."
                    continue
                if resp.status_code != 200:
                    detail = resp.json().get('error', {}).get('message', resp.text[:200])
                    last_error = f"Gemini error ({resp.status_code}): {detail}"
                    continue
                return _parse_gemini_response(resp.json())
            except json.JSONDecodeError:
                last_error = "AI returned invalid response. Please try again."
                continue
            except Exception as e:
                last_error = str(e)
                continue
            
    raise Exception(last_error)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_detect_food(request):
    """Detect food items from an image using Gemini Vision."""
    image_data = request.data.get('image')  # base64 encoded
    mime_type = request.data.get('mime_type', 'image/jpeg')

    if not image_data:
        return Response({"error": "No image provided."}, status=400)

    try:
        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        result = _call_gemini_vision(FOOD_DETECT_PROMPT, image_data, mime_type)
        return Response({"items": result})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_calculate_nutrition(request):
    """Calculate nutrition for food items with quantities using Gemini."""
    items = request.data.get('items', [])
    if not items:
        return Response({"error": "No items provided."}, status=400)

    try:
        prompt = NUTRITION_CALC_PROMPT.format(items=json.dumps(items))
        result = _call_gemini_text(prompt)
        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_text_to_food(request):
    """Parse text description of food into structured items using Gemini."""
    text = request.data.get('text', '')
    if not text:
        return Response({"error": "No text provided."}, status=400)

    try:
        prompt = TEXT_FOOD_PROMPT.format(text=text)
        result = _call_gemini_text(prompt)
        return Response({"items": result})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


VOICE_TRANSCRIPTION_PROMPT = """You are a food logging assistant. This audio is someone describing what they ate.
Transcribe the audio, then identify all food items mentioned.
Support both Arabic (مصري/عامية) and English.

Return ONLY valid JSON, no markdown:
{"transcript": "what the person said", "items": [{"name": "Koshari (كشري)", "emoji": "🍜", "estimated_grams": 350}]}
"""


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_voice_to_food(request):
    """Transcribe audio and detect food items using Gemini."""
    audio_data = request.data.get('audio')
    mime_type = request.data.get('mime_type', 'audio/webm')

    if not audio_data:
        return Response({"error": "No audio provided."}, status=400)

    try:
        if ',' in audio_data:
            audio_data = audio_data.split(',')[1]

        # Use Gemini with audio input (same as vision but with audio)
        payload = {
            "contents": [{
                "parts": [
                    {"text": VOICE_TRANSCRIPTION_PROMPT},
                    {"inline_data": {"mime_type": mime_type, "data": audio_data}}
                ]
            }]
        }

        last_error = "No API keys configured."
        result = None
        for model in GEMINI_MODELS:
            for key in GEMINI_API_KEYS:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
                try:
                    resp = http_requests.post(url, json=payload, timeout=30)
                    if resp.status_code == 429:
                        last_error = f"Quota exceeded for {model}, trying next..."
                        continue
                    if resp.status_code != 200:
                        detail = resp.json().get('error', {}).get('message', resp.text[:200])
                        last_error = f"Gemini error ({resp.status_code}): {detail}"
                        continue
                    result = _parse_gemini_response(resp.json())
                    break
                except json.JSONDecodeError:
                    last_error = "AI returned invalid response."
                    continue
                except Exception as e:
                    last_error = str(e)
                    continue
            if result:
                break

        if not result:
            raise Exception(last_error)

        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

USDA_API_KEY = getattr(settings, 'USDA_API_KEY', '')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usda_search(request):
    """Search USDA FoodData Central for foods."""
    query = request.query_params.get('q', '')
    if not query:
        return Response({"error": "No query provided."}, status=400)

    try:
        url = "https://api.nal.usda.gov/fdc/v1/foods/search"
        params = {"api_key": USDA_API_KEY, "query": query, "pageSize": 10}
        resp = http_requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        foods = []
        for food in data.get('foods', [])[:10]:
            nutrients = {n['nutrientName']: n.get('value', 0)
                         for n in food.get('foodNutrients', [])}
            foods.append({
                "fdc_id": food.get('fdcId'),
                "name": food.get('description', ''),
                "brand": food.get('brandName', ''),
                "calories": nutrients.get('Energy', 0),
                "protein": nutrients.get('Protein', 0),
                "carbs": nutrients.get('Carbohydrate, by difference', 0),
                "fat": nutrients.get('Total lipid (fat)', 0),
            })
        return Response({"foods": foods})
    except http_requests.exceptions.RequestException as e:
        return Response({"error": str(e)}, status=502)


# ─── Weight Logs CRUD ──────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def weight_logs_view(request):
    """List or create weight log entries."""
    if request.method == 'GET':
        logs = WeightLog.objects.filter(user=request.user)[:20]
        serializer = WeightLogSerializer(logs, many=True)
        return Response(serializer.data)

    # POST
    serializer = WeightLogSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    log = serializer.save(user=request.user)
    # Also update profile weight
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    profile.weight_kg = log.weight_kg
    profile.save()
    return Response(WeightLogSerializer(log).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def weight_log_detail_view(request, log_id):
    """Get, update, or delete a weight log entry."""
    try:
        log = WeightLog.objects.get(id=log_id, user=request.user)
    except WeightLog.DoesNotExist:
        return Response({"error": "Weight log not found."}, status=404)

    if request.method == 'GET':
        return Response(WeightLogSerializer(log).data)

    if request.method == 'DELETE':
        log.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PUT
    serializer = WeightLogSerializer(log, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def last_weight_check(request):
    """Get the last weight log entry date to determine if check-in is needed."""
    last_log = WeightLog.objects.filter(user=request.user).first()
    if last_log:
        days_since = (date.today() - last_log.date).days
        return Response({
            "last_date": last_log.date,
            "days_since": days_since,
            "needs_checkin": days_since >= 7,
            "last_weight": last_log.weight_kg,
        })
    return Response({"last_date": None, "days_since": None, "needs_checkin": True, "last_weight": None})


# ─── InBody OCR ────────────────────────────────────────────────────────────────

INBODY_OCR_PROMPT = """You are a health data extraction AI. This image is an InBody body composition report or a similar body measurement report.

Extract the following data from the report:
- weight_kg: Body weight in kilograms
- body_fat_pct: Body fat percentage
- muscle_mass_kg: Skeletal muscle mass in kilograms
- bmi: BMI value

If a value is not found, set it to null.

Return ONLY valid JSON, no markdown:
{"weight_kg": 70.5, "body_fat_pct": 18.2, "muscle_mass_kg": 32.1, "bmi": 23.4}
"""


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_ocr_inbody(request):
    """Extract body composition data from an InBody report image using Gemini OCR."""
    image_data = request.data.get('image')
    mime_type = request.data.get('mime_type', 'image/jpeg')

    if not image_data:
        return Response({"error": "No image provided."}, status=400)

    try:
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        result = _call_gemini_vision(INBODY_OCR_PROMPT, image_data, mime_type)
        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ─── Coaching: Diet Plan ───────────────────────────────────────────────────────

from .models import DietPlan, DietPlanTracking, GymPlan, GymPlanTracking
from .serializers import DietPlanSerializer, DietPlanTrackingSerializer, GymPlanSerializer, GymPlanTrackingSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def diet_plan_view(request):
    """Get the user's active diet plan."""
    plan = DietPlan.objects.filter(user=request.user, status='active').first()
    if not plan:
        return Response({"plan": None})
    serializer = DietPlanSerializer(plan)
    return Response({"plan": serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def diet_plan_generate(request):
    """Generate a diet plan using Gemini based on user preferences."""
    data = request.data
    meals_per_day = data.get('meals_per_day', 3)
    snacks_per_day = data.get('snacks_per_day', 1)
    liked_foods = data.get('liked_foods', [])
    disliked_foods = data.get('disliked_foods', [])

    # Get user profile for TDEE computation
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    tdee = profile.tdee or 2000
    target_cals = profile.daily_calories_target or tdee
    goal = profile.goal or 'maintain'
    weight = profile.weight_kg or 70
    gender = profile.gender or 'male'
    age = profile.age or 25

    prompt = f"""You are a certified nutritionist AI. Create a detailed daily meal plan.

USER PROFILE:
- Gender: {gender}, Age: {age}, Weight: {weight}kg
- Goal: {goal} weight
- TDEE: {tdee} kcal, Target calories: {target_cals} kcal
- Meals per day: {meals_per_day}
- Snacks per day: {snacks_per_day}
- Liked foods: {', '.join(liked_foods) if liked_foods else 'No preference'}
- Disliked foods (MUST AVOID): {', '.join(disliked_foods) if disliked_foods else 'None'}

REQUIREMENTS:
1. Create exactly {meals_per_day} meals and {snacks_per_day} snacks
2. Total calories MUST be close to {target_cals} kcal (within 50 kcal)
3. Macros: ~30% protein, ~40% carbs, ~30% fat
4. Include Arabic/Egyptian foods like koshari, foul, falafel, mahshi, molokhia if user likes them
5. Each meal must have a name (Arabic+English), emoji, items with grams, and macros
6. Be very precise with calorie counts

Return ONLY valid JSON, no markdown:
{{
  "meals": [
    {{
      "type": "breakfast",
      "name": "Egg & Foul Breakfast (فطار فول وبيض)",
      "emoji": "🥚",
      "time": "8:00 AM",
      "items": [
        {{"name": "Foul Medames (فول مدمس)", "grams": 200, "calories": 180, "protein": 12, "carbs": 24, "fat": 3}},
        {{"name": "Boiled Egg (بيض مسلوق)", "grams": 100, "calories": 155, "protein": 13, "carbs": 1, "fat": 11}}
      ],
      "total_calories": 335,
      "total_protein": 25,
      "total_carbs": 25,
      "total_fat": 14
    }}
  ],
  "snacks": [
    {{
      "name": "Fruit Bowl (طبق فواكه)",
      "emoji": "🍎",
      "items": [{{"name": "Apple (تفاح)", "grams": 150, "calories": 78, "protein": 0, "carbs": 21, "fat": 0}}],
      "total_calories": 78,
      "total_protein": 0,
      "total_carbs": 21,
      "total_fat": 0
    }}
  ],
  "daily_total": {{"calories": {target_cals}, "protein": 150, "carbs": 200, "fat": 67}}
}}"""

    try:
        result = _call_gemini_text(prompt)

        # Archive any existing active plans
        DietPlan.objects.filter(user=request.user, status='active').update(status='archived')

        daily = result.get('daily_total', {})
        plan = DietPlan.objects.create(
            user=request.user,
            meals_per_day=meals_per_day,
            snacks_per_day=snacks_per_day,
            liked_foods=liked_foods,
            disliked_foods=disliked_foods,
            plan_data=result,
            total_calories=daily.get('calories', 0),
            total_protein=daily.get('protein', 0),
            total_carbs=daily.get('carbs', 0),
            total_fat=daily.get('fat', 0),
            status='active',
        )

        serializer = DietPlanSerializer(plan)
        return Response({"plan": serializer.data})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def diet_plan_swap(request):
    """Swap a meal item in the diet plan using Gemini."""
    plan = DietPlan.objects.filter(user=request.user, status='active').first()
    if not plan:
        return Response({"error": "No active diet plan."}, status=404)

    meal_index = request.data.get('meal_index')
    meal_type = request.data.get('meal_type', 'meals')  # 'meals' or 'snacks'
    swap_request = request.data.get('swap_request', '')

    if meal_index is None:
        return Response({"error": "meal_index is required."}, status=400)

    plan_data = plan.plan_data
    items_list = plan_data.get(meal_type, [])
    if meal_index >= len(items_list):
        return Response({"error": "Invalid meal index."}, status=400)

    current_meal = items_list[meal_index]
    target_cals = current_meal.get('total_calories', 400)

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    disliked = ', '.join(plan.disliked_foods) if plan.disliked_foods else 'None'

    prompt = f"""You are a nutritionist. Replace this meal with a different one.

CURRENT MEAL: {json.dumps(current_meal, ensure_ascii=False)}
USER REQUEST: {swap_request if swap_request else 'Give me a different option'}
TARGET CALORIES: approximately {target_cals} kcal (within 50 kcal)
DISLIKED FOODS (AVOID): {disliked}

Return ONLY valid JSON with the replacement meal in the EXACT same format:
{{
  "type": "{current_meal.get('type', 'meal')}",
  "name": "New Meal Name",
  "emoji": "🍽️",
  "time": "{current_meal.get('time', '12:00 PM')}",
  "items": [{{"name": "Item", "grams": 200, "calories": 300, "protein": 20, "carbs": 30, "fat": 10}}],
  "total_calories": {target_cals},
  "total_protein": 20,
  "total_carbs": 30,
  "total_fat": 10
}}"""

    try:
        new_meal = _call_gemini_text(prompt)
        items_list[meal_index] = new_meal
        plan_data[meal_type] = items_list

        # Recalculate totals
        all_meals = plan_data.get('meals', []) + plan_data.get('snacks', [])
        total_cal = sum(m.get('total_calories', 0) for m in all_meals)
        total_p = sum(m.get('total_protein', 0) for m in all_meals)
        total_c = sum(m.get('total_carbs', 0) for m in all_meals)
        total_f = sum(m.get('total_fat', 0) for m in all_meals)

        plan_data['daily_total'] = {'calories': total_cal, 'protein': total_p, 'carbs': total_c, 'fat': total_f}
        plan.plan_data = plan_data
        plan.total_calories = total_cal
        plan.total_protein = total_p
        plan.total_carbs = total_c
        plan.total_fat = total_f
        plan.save()

        serializer = DietPlanSerializer(plan)
        return Response({"plan": serializer.data})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def diet_plan_track(request):
    """Get or save diet tracking for today."""
    plan = DietPlan.objects.filter(user=request.user, status='active').first()
    if not plan:
        return Response({"error": "No active diet plan."}, status=404)

    today = date.today()

    if request.method == 'GET':
        tracking = DietPlanTracking.objects.filter(plan=plan, date=today).first()
        if tracking:
            serializer = DietPlanTrackingSerializer(tracking)
            return Response(serializer.data)
        return Response({"meals_completed": {}, "date": str(today)})

    # POST
    tracking, created = DietPlanTracking.objects.update_or_create(
        plan=plan, date=today, user=request.user,
        defaults={
            'meals_completed': request.data.get('meals_completed', {}),
            'notes': request.data.get('notes', ''),
        }
    )
    serializer = DietPlanTrackingSerializer(tracking)
    return Response(serializer.data)


# ─── Coaching: Gym Plan ────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gym_plan_view(request):
    """Get the user's active gym plan."""
    plan = GymPlan.objects.filter(user=request.user, status='active').first()
    if not plan:
        return Response({"plan": None})
    serializer = GymPlanSerializer(plan)
    return Response({"plan": serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def gym_plan_generate(request):
    """Generate a gym plan using Gemini."""
    data = request.data
    days_per_week = data.get('days_per_week', 3)
    session_minutes = data.get('session_minutes', 60)
    focus_areas = data.get('focus_areas', ['strength'])
    fitness_level = data.get('fitness_level', 'beginner')

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    goal = profile.goal or 'maintain'
    weight = profile.weight_kg or 70
    gender = profile.gender or 'male'
    age = profile.age or 25

    prompt = f"""You are a certified personal trainer AI. Create a weekly gym workout plan.

USER PROFILE:
- Gender: {gender}, Age: {age}, Weight: {weight}kg
- Goal: {goal} weight
- Training days per week: {days_per_week}
- Session duration: {session_minutes} minutes
- Focus areas: {', '.join(focus_areas)}
- Fitness level: {fitness_level}

REQUIREMENTS:
1. Create exactly {days_per_week} training days
2. Each day should have 5-8 exercises appropriate for {fitness_level} level
3. Include warm-up and cool-down
4. For each exercise, provide a YouTube search query that will find a good tutorial video
5. Each exercise must specify sets, reps, rest time, and target muscle group
6. Progressive overload principles apply

Return ONLY valid JSON, no markdown:
{{
  "days": [
    {{
      "day_number": 1,
      "name": "Push Day (Chest & Shoulders)",
      "focus": "chest, shoulders, triceps",
      "estimated_duration_min": {session_minutes},
      "exercises": [
        {{
          "name": "Barbell Bench Press",
          "muscle_group": "Chest",
          "sets": 4,
          "reps": "8-10",
          "rest_seconds": 90,
          "youtube_search": "barbell bench press proper form tutorial",
          "notes": "Keep shoulder blades retracted"
        }}
      ]
    }}
  ],
  "weekly_schedule": "Day 1: Push, Day 2: Pull, Day 3: Legs",
  "tips": ["Stay hydrated", "Progressive overload weekly"]
}}"""

    try:
        result = _call_gemini_text(prompt)

        # Archive existing active plans
        GymPlan.objects.filter(user=request.user, status='active').update(status='archived')

        plan = GymPlan.objects.create(
            user=request.user,
            days_per_week=days_per_week,
            session_minutes=session_minutes,
            focus_areas=focus_areas,
            fitness_level=fitness_level,
            plan_data=result,
            status='active',
        )

        serializer = GymPlanSerializer(plan)
        return Response({"plan": serializer.data})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def gym_plan_swap(request):
    """Swap an exercise in the gym plan using Gemini."""
    plan = GymPlan.objects.filter(user=request.user, status='active').first()
    if not plan:
        return Response({"error": "No active gym plan."}, status=404)

    day_index = request.data.get('day_index')
    exercise_index = request.data.get('exercise_index')
    swap_request = request.data.get('swap_request', '')

    if day_index is None or exercise_index is None:
        return Response({"error": "day_index and exercise_index are required."}, status=400)

    plan_data = plan.plan_data
    days = plan_data.get('days', [])
    if day_index >= len(days):
        return Response({"error": "Invalid day index."}, status=400)

    exercises = days[day_index].get('exercises', [])
    if exercise_index >= len(exercises):
        return Response({"error": "Invalid exercise index."}, status=400)

    current_exercise = exercises[exercise_index]

    prompt = f"""You are a personal trainer. Replace this exercise with a different one targeting the same muscle group.

CURRENT EXERCISE: {json.dumps(current_exercise, ensure_ascii=False)}
USER REQUEST: {swap_request if swap_request else 'Give me a different exercise'}
TARGET MUSCLE: {current_exercise.get('muscle_group', 'general')}
FITNESS LEVEL: {plan.fitness_level}

Return ONLY valid JSON with the replacement exercise in the EXACT same format:
{{
  "name": "New Exercise Name",
  "muscle_group": "{current_exercise.get('muscle_group', 'general')}",
  "sets": {current_exercise.get('sets', 3)},
  "reps": "{current_exercise.get('reps', '10-12')}",
  "rest_seconds": {current_exercise.get('rest_seconds', 60)},
  "youtube_search": "new exercise proper form tutorial",
  "notes": "Form tips here"
}}"""

    try:
        new_exercise = _call_gemini_text(prompt)
        exercises[exercise_index] = new_exercise
        days[day_index]['exercises'] = exercises
        plan_data['days'] = days
        plan.plan_data = plan_data
        plan.save()

        serializer = GymPlanSerializer(plan)
        return Response({"plan": serializer.data})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def gym_plan_track(request):
    """Get or save gym tracking for today."""
    plan = GymPlan.objects.filter(user=request.user, status='active').first()
    if not plan:
        return Response({"error": "No active gym plan."}, status=404)

    today = date.today()

    if request.method == 'GET':
        tracking = GymPlanTracking.objects.filter(plan=plan, date=today).first()
        if tracking:
            serializer = GymPlanTrackingSerializer(tracking)
            return Response(serializer.data)
        return Response({"completed": False, "exercises_completed": {}, "date": str(today)})

    # POST
    tracking, created = GymPlanTracking.objects.update_or_create(
        plan=plan, date=today, user=request.user,
        defaults={
            'day_index': request.data.get('day_index', 0),
            'completed': request.data.get('completed', False),
            'exercises_completed': request.data.get('exercises_completed', {}),
            'notes': request.data.get('notes', ''),
        }
    )
    serializer = GymPlanTrackingSerializer(tracking)
    return Response(serializer.data)
