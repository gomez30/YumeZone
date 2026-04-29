<div align="center">
  <img src="api/static/images/logos/logo.png" alt="YumeZone Logo" width="200">
  <h1>YumeZone</h1>
  <p><strong>Your Ultimate Ad-Free Anime & Manga Streaming Experience</strong></p>
  
  <p>
    <a href="https://yumezone.vercel.app/home"><strong>⛩️ YumeZone</strong></a>
  </p>

  <p>
    <a href="#-key-features">Features</a> •
    <a href="#%EF%B8%8F-tech-stack">Tech Stack</a> •
    <a href="#-installation">Installation</a> •
    <a href="#-contributing">Contributing</a>
  </p>
</div>

---

## 📖 Introduction

**YumeZone** is a highly polished, feature-rich anime & manga platform built for fans who want a seamless, ad-free experience. It hooks into AniList and MyAnimeList and utilizes the Miruro API to provide a comprehensive anime library — along with a fully integrated manga reader — all wrapped in a gorgeous Glassmorphism user interface.

Our focus is entirely on usability, speed, and cross-platform consistency.

## ✨ Key Features

- **🚫 Ad-Free Streaming & Reading**: Pure entertainment without popups, redirects, or visual clutter.
- **📺 High-Quality Playback**: Fast streaming with multiple server options, subtitle/audio toggles, and quality selectors natively baked into the player.
- **⏭️ Intro & Outro Skip**: Smart episode intro and outro detection on the anime info page — skip straight to the action or the next episode with a single click.
- **📚 Manga Reader**: Browse, search, and read manga directly on YumeZone with a clean, distraction-free chapter reader.
- **🔄 Two-Way Tracker Sync**: Link **AniList** and **MyAnimeList** accounts! The player will automatically update your viewing progress seamlessly in the background as you watch.
- **💬 Live Comments & Reactions**: Express yourself on episodes using the custom-built nested comment system with integrated GIF support. Drop quick "likes" or "dislikes" on comments and specific episodes.
- **⏯️ Smart Resume**: Intelligent tracking remembers exactly what episode you were on. "Watch Now" will instantly drop you back into the action.
- **🎨 Modern UI/UX**:
    - **Glassmorphism Design**: Sleek, immersive dark-themed presentation.
    - **Spotlight Carousel**: Discover tracking information, genres, ratings, and studios right from the top page.
    - **Cinema Mode**: Distraction-free, immersive video player layout.
    - **Fully Responsive**: A premium and consistent experience whether you are on Desktop, Tablet, or Mobile.
- **🔐 Secure Authentication**: Includes full user accounts, password recovery flow via email, Turnstile bot protection, and more.
- **🔎 Advanced Discoverability**: Deep search, category filtering, schedule countdowns, and genre exploration — for both anime and manga.

## 🛠️ Tech Stack

- **Backend**: Python (Flask, Async/Await)
- **Frontend**: HTML5, CSS3 (Vanilla / Custom Variables), JavaScript
- **Video Player**: Video.js with specialized integrations
- **Database**: MongoDB (User accounts, watch history, caching logic)
- **Data & Streaming APIs**: Miruro Native API, AniList GraphQL, MyAnimeList OAuth API
- **Security**: Cloudflare Turnstile, Bcrypt Password Hashing, Session Versioning

## 🚀 Installation & Local Development

Ready to run YumeZone locally? Follow these steps:

1. **Clone the Repository**
    ```bash
    git clone https://github.com/OTAKUWeBer/YumeZone
    cd YumeZone
    ```

2. **Create a Virtual Environment**
    ```bash
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # macOS/Linux
    source venv/bin/activate
    ```

3. **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

4. **Set Up Environment Variables**
    Duplicate `.env.example` and rename it to `.env`.

    **Minimal Vercel runtime (core browsing + streaming):**
    ```env
    FLASK_KEY="YOUR_RANDOM_FLASK_SECRET_KEY"
    API_KEY="YOUR_GENERATED_API_KEY"
    MIRURO_API_URL="https://api.your-domain.com/"
    PROXY_URL="https://proxy.your-domain.com/proxy/"
    ```

    **Optional feature flags (defaults auto-detect by env presence):**
    ```env
    ENABLE_AUTH="false"
    ENABLE_WATCHLIST="false"
    ENABLE_TURNSTILE="false"
    ENABLE_EMAIL_RESET="false"
    ENABLE_ANILIST="false"
    ENABLE_MAL="false"
    ```

    **Optional integrations (only needed if you enable those features):**
    - MongoDB: `MONGODB_URI`, `db`, `users_collection`, `watchlist_collection`, `comments_collection`, `episode_reactions_collection`
    - Turnstile: `CLOUDFLARE_SECRET`, `CF_SITE_KEY`
    - Gmail reset mail: `GMAIL_USER`, `GMAIL_APP_PASSWORD`
    - AniList OAuth: `ANILIST_CLIENT_ID`, `ANILIST_CLIENT_SECRET`, `ANILIST_REDIRECT_URI`
    - MyAnimeList OAuth: `MAL_CLIENT_ID`, `MAL_CLIENT_SECRET`, `MAL_REDIRECT_URI`

5. **Run the Application**
    ```bash
    python run.py
    ```
    Access the application right from your browser at `http://localhost:5000`.

## ⚙️ Integrations Setup Notes

- **Miruro API**: You'll need access to a Miruro-compatible data API instance for anime indexing and m3u8 stream resolution.
- **Minimal Deploy Mode**: If you only set `FLASK_KEY`, `API_KEY`, `MIRURO_API_URL`, and `PROXY_URL`, the app runs in streaming-focused mode with account features hidden.
- **AniList & MyAnimeList**: Optional. Create apps in their Developer Portals and match OAuth Redirect URIs to `.env` values when enabled.
- **Cloudflare Turnstile**: Optional. Enable only if you want captcha on auth forms.
- **API Key**: `API_KEY` is used for internal service-to-service security. Generate a strong random string the same way as `FLASK_KEY` — keep it secret and never commit it to version control.
- **Passwords via Gmail**: Optional. Required only if you enable password reset emails.

## 🤝 Contributing

We welcome community contributions! Found a bug, or have a UI polish idea? Read our setup to dive in:

1. **Fork the Project**
2. Create your Feature Branch (`git checkout -b feature/CoolNewAddition`)
3. Commit your Changes (`git commit -m 'feat: Add a new custom player skin'`)
4. Push to the Branch (`git push origin feature/CoolNewAddition`)
5. Open a **Pull Request**

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).

---

<div align="center">
  <p>Made with ❤️ for the Anime & Manga Community</p>
</div>