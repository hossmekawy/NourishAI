from rest_framework import serializers
from .models import UserProfile, MealLog, WeightLog, DietPlan, DietPlanTracking, GymPlan, GymPlanTracking


class UserProfileSerializer(serializers.ModelSerializer):
    bmi = serializers.FloatField(read_only=True)
    bmr = serializers.IntegerField(read_only=True)
    tdee = serializers.IntegerField(read_only=True)
    daily_calories_target = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    full_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'gender', 'age', 'weight_kg', 'height_cm', 'goal',
            'activity_level', 'onboarding_complete',
            'bmi', 'bmr', 'tdee', 'daily_calories_target',
            'email', 'first_name', 'last_name', 'full_name', 'avatar_url',
        ]

    def get_full_name(self, obj):
        name = obj.user.get_full_name()
        return name if name else obj.user.username

    def get_avatar_url(self, obj):
        if obj.avatar_url:
            return obj.avatar_url
        # Try to get Google avatar
        social = obj.user.socialaccount_set.filter(provider='google').first()
        if social and social.extra_data.get('picture'):
            return social.extra_data['picture']
        return None


class OnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['gender', 'age', 'weight_kg', 'height_cm', 'goal', 'activity_level']

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.onboarding_complete = True
        instance.save()
        return instance


class MealLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealLog
        fields = ['id', 'name', 'emoji', 'calories', 'protein', 'carbs', 'fat',
                  'meal_items', 'date', 'created_at', 'updated_at']
        read_only_fields = ['id', 'date', 'created_at', 'updated_at']


class WeightLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeightLog
        fields = ['id', 'weight_kg', 'body_fat_pct', 'muscle_mass_kg', 'bmi',
                  'notes', 'source', 'date', 'created_at']
        read_only_fields = ['id', 'created_at']


class DietPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = DietPlan
        fields = ['id', 'meals_per_day', 'snacks_per_day', 'liked_foods', 'disliked_foods',
                  'plan_data', 'total_calories', 'total_protein', 'total_carbs', 'total_fat',
                  'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DietPlanTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = DietPlanTracking
        fields = ['id', 'plan', 'date', 'meals_completed', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class GymPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymPlan
        fields = ['id', 'days_per_week', 'session_minutes', 'focus_areas', 'fitness_level',
                  'plan_data', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class GymPlanTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymPlanTracking
        fields = ['id', 'plan', 'date', 'day_index', 'completed', 'exercises_completed',
                  'notes', 'created_at']
        read_only_fields = ['id', 'created_at']

