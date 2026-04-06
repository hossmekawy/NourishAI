from django.urls import path
from . import views

urlpatterns = [
    path('profile/', views.profile_view, name='profile'),
    path('settings/', views.settings_view, name='settings'),
    path('onboarding/', views.onboarding_view, name='onboarding'),
    path('barcode/<str:barcode>/', views.barcode_view, name='barcode'),

    # Meals CRUD
    path('meals/', views.meals_view, name='meals'),
    path('meals/<int:meal_id>/', views.meal_detail_view, name='meal-detail'),

    # AI endpoints
    path('ai/detect-food/', views.ai_detect_food, name='ai-detect-food'),
    path('ai/calculate-nutrition/', views.ai_calculate_nutrition, name='ai-calculate-nutrition'),
    path('ai/text-to-food/', views.ai_text_to_food, name='ai-text-to-food'),
    path('ai/voice-to-food/', views.ai_voice_to_food, name='ai-voice-to-food'),
    path('ai/ocr-inbody/', views.ai_ocr_inbody, name='ai-ocr-inbody'),

    # USDA search
    path('usda/search/', views.usda_search, name='usda-search'),

    # Weight Logs
    path('weight/', views.weight_logs_view, name='weight-logs'),
    path('weight/<int:log_id>/', views.weight_log_detail_view, name='weight-log-detail'),
    path('weight/check/', views.last_weight_check, name='weight-check'),

    # Coaching: Diet Plan
    path('coaching/diet/', views.diet_plan_view, name='diet-plan'),
    path('coaching/diet/generate/', views.diet_plan_generate, name='diet-plan-generate'),
    path('coaching/diet/swap/', views.diet_plan_swap, name='diet-plan-swap'),
    path('coaching/diet/track/', views.diet_plan_track, name='diet-plan-track'),

    # Coaching: Gym Plan
    path('coaching/gym/', views.gym_plan_view, name='gym-plan'),
    path('coaching/gym/generate/', views.gym_plan_generate, name='gym-plan-generate'),
    path('coaching/gym/swap/', views.gym_plan_swap, name='gym-plan-swap'),
    path('coaching/gym/track/', views.gym_plan_track, name='gym-plan-track'),
]

