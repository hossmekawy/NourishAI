from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
    ]

    GOAL_CHOICES = [
        ('lose', 'Lose Weight'),
        ('maintain', 'Maintain Weight'),
        ('gain', 'Gain Weight'),
    ]

    ACTIVITY_CHOICES = [
        ('sedentary', 'Sedentary (little or no exercise)'),
        ('light', 'Lightly active (1-3 days/week)'),
        ('moderate', 'Moderately active (3-5 days/week)'),
        ('active', 'Very active (6-7 days/week)'),
        ('extra', 'Extra active (very hard exercise)'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    weight_kg = models.FloatField(null=True, blank=True)
    height_cm = models.FloatField(null=True, blank=True)
    goal = models.CharField(max_length=10, choices=GOAL_CHOICES, blank=True)
    activity_level = models.CharField(max_length=10, choices=ACTIVITY_CHOICES, blank=True, default='sedentary')
    avatar_url = models.URLField(max_length=1024, blank=True, null=True)
    onboarding_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

    @property
    def bmi(self):
        if self.weight_kg and self.height_cm:
            height_m = self.height_cm / 100
            return round(self.weight_kg / (height_m ** 2), 1)
        return None

    @property
    def bmr(self):
        """Basal Metabolic Rate using Mifflin-St Jeor equation."""
        if not all([self.weight_kg, self.height_cm, self.age, self.gender]):
            return None
        if self.gender == 'male':
            return round(10 * self.weight_kg + 6.25 * self.height_cm - 5 * self.age + 5)
        else:
            return round(10 * self.weight_kg + 6.25 * self.height_cm - 5 * self.age - 161)

    @property
    def tdee(self):
        """Total Daily Energy Expenditure."""
        if self.bmr is None:
            return None
        multipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'extra': 1.9,
        }
        return round(self.bmr * multipliers.get(self.activity_level, 1.2))

    @property
    def daily_calories_target(self):
        if self.tdee is None:
            return None
        adjustments = {'lose': -500, 'maintain': 0, 'gain': 500}
        return self.tdee + adjustments.get(self.goal, 0)


class MealLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meals')
    name = models.CharField(max_length=255)
    emoji = models.CharField(max_length=10, blank=True, default='🍽️')
    calories = models.FloatField(default=0)
    protein = models.FloatField(default=0)
    carbs = models.FloatField(default=0)
    fat = models.FloatField(default=0)
    meal_items = models.JSONField(default=list, blank=True)
    date = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.emoji} {self.name} ({self.calories} kcal)"


class WeightLog(models.Model):
    SOURCE_CHOICES = [
        ('manual', 'Manual Entry'),
        ('inbody', 'InBody OCR'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weight_logs')
    weight_kg = models.FloatField()
    body_fat_pct = models.FloatField(null=True, blank=True)
    muscle_mass_kg = models.FloatField(null=True, blank=True)
    bmi = models.FloatField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default='manual')
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.username}: {self.weight_kg}kg on {self.date}"


class DietPlan(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('archived', 'Archived'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='diet_plans')
    meals_per_day = models.PositiveIntegerField(default=3)
    snacks_per_day = models.PositiveIntegerField(default=1)
    liked_foods = models.JSONField(default=list, blank=True)
    disliked_foods = models.JSONField(default=list, blank=True)
    plan_data = models.JSONField(default=dict, blank=True)  # Generated plan from Gemini
    total_calories = models.FloatField(default=0)
    total_protein = models.FloatField(default=0)
    total_carbs = models.FloatField(default=0)
    total_fat = models.FloatField(default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username}'s diet plan ({self.meals_per_day} meals)"


class DietPlanTracking(models.Model):
    plan = models.ForeignKey(DietPlan, on_delete=models.CASCADE, related_name='tracking')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='diet_tracking')
    date = models.DateField()
    meals_completed = models.JSONField(default=dict, blank=True)  # {meal_index: bool}
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        unique_together = ['plan', 'date']

    def __str__(self):
        return f"{self.user.username} diet tracking {self.date}"


class GymPlan(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('archived', 'Archived'),
    ]
    LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gym_plans')
    days_per_week = models.PositiveIntegerField(default=3)
    session_minutes = models.PositiveIntegerField(default=60)
    focus_areas = models.JSONField(default=list, blank=True)  # ["strength", "cardio", ...]
    fitness_level = models.CharField(max_length=15, choices=LEVEL_CHOICES, default='beginner')
    plan_data = models.JSONField(default=dict, blank=True)  # Generated plan from Gemini
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username}'s gym plan ({self.days_per_week}x/week)"


class GymPlanTracking(models.Model):
    plan = models.ForeignKey(GymPlan, on_delete=models.CASCADE, related_name='tracking')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gym_tracking')
    date = models.DateField()
    day_index = models.PositiveIntegerField(default=0)  # Which day of the plan
    completed = models.BooleanField(default=False)
    exercises_completed = models.JSONField(default=dict, blank=True)  # {exercise_index: bool}
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        unique_together = ['plan', 'date']

    def __str__(self):
        return f"{self.user.username} gym tracking {self.date}"

