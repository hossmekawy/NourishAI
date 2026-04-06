# NourishAI 🥗💪

NourishAI is a full-stack, AI-powered health and fitness companion application. It uses Google's Gemini AI to provide personalized diet plans, custom workout routines, multimodal food logging (voice and image), and InBody report OCR.

## Features ✨

* **AI Coaching**
  * **Diet Plans:** 5-step wizard to generate customized meal plans based on your TDEE, macros, and preferences (liked/disliked foods). Supports swapping meals dynamically using AI.
  * **Gym Plans:** Generate tailored workout routines complete with exercise sets, reps, and embedded YouTube tutorials. Swap exercises while targeting the same muscle group.
* **Multimodal Food Logging**
  * **Voice Log:** Speak what you ate (in English or Arabic), and Gemini extracts the food items, calculates portions, and logs the macros.
  * **Vision Log:** Snap a photo of your meal for AI-powered food recognition and calorie estimation.
  * **Text Search:** Powered by the USDA FoodData Central API for verified nutritional data.
* **InBody OCR & Weight Tracking**
  * Upload an InBody report photo/PDF, and Gemini Vision automatically extracts your weight, body fat %, muscle mass, and BMI.
* **Dashboard & Adherence**
  * Track daily caloric intake with dynamic rings and macro progress bars.
  * Monitor progress for both diet plans and gym routines.
* **Onboarding & Personalization**
  * Mandatory BMI and goal assessment for new users.
  * Calculates TDEE (Total Daily Energy Expenditure) based on the Mifflin-St Jeor equation.

## Tech Stack 🛠️

**Frontend:**
* [Next.js](https://nextjs.org/) (App Router, React 18)
* [Tailwind CSS](https://tailwindcss.com/) for styling
* [Lucide Icons](https://lucide.dev/) for iconography
* Web APIs: `MediaRecorder` for audio capture, `Camera` for image capture

**Backend:**
* [Django](https://www.djangoproject.com/) & [Django REST Framework](https://www.django-rest-framework.org/)
* SQLite (Database)
* JWT Authentication via `djangorestframework-simplejwt`

**AI Integrations:**
* [Google Gemini API](https://ai.google.dev/) (`gemini-2.5-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`) used for text/json generation, vision OCR, and audio transcription.

## Setup Instructions 🚀

### Prerequisites
* Node.js (v18+)
* Python (3.10+)
* Google Gemini API Key
* USDA FoodData Central API Key

### Backend Setup
1. Open a terminal and navigate to the `backend` folder.
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables. Create a `.env` file in the `backend/` directory:
   ```env
   SECRET_KEY=your_django_secret_key
   DEBUG=True
   GEMINI_API_KEY_1=your_gemini_api_key
   USDA_API_KEY=your_usda_api_key
   ```
5. Apply migrations and run the server:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

### Frontend Setup
1. Open a new terminal and navigate to the `frontend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the app at `http://localhost:3000`.

## Design
* Premium UI with a cohesive color palette, dynamic components, and smooth transitions inspired by modern health apps.
* Fully responsive layout prioritizing mobile experiences.
