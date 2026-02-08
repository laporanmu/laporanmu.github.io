# Laporanmu

> Sistem Manajemen Perilaku Siswa - Student Behavior Management System

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-7-purple?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Ready-green?logo=supabase)

## ✨ Features

- 🏠 **Landing Page** - Modern, responsive landing page
- 🔐 **Multi-Role Authentication** - Admin, Guru, Pengurus roles
- 👨‍👩‍👧 **Parent Portal** - Check student data with registration code + PIN
- 📊 **Analytics Dashboard** - Charts and statistics
- 📋 **Behavior Reports** - Track violations and achievements
- 🎓 **Master Data** - Manage students, teachers, classes, violations
- 🌙 **Dark Mode** - Full dark/light theme support
- 📱 **Responsive** - Works on all devices
- 💬 **WhatsApp Integration** - Quick contact parents

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

## 🎮 Demo Mode

The app works without Supabase in demo mode. Use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@laporanmu.id | demo123 |
| Guru | guru@laporanmu.id | demo123 |
| Pengurus | pengurus@laporanmu.id | demo123 |

**Parent Portal**: Code `REG-7K3Q-9P2X`, PIN `1234`

## 🔧 Supabase Setup

1. Create a [Supabase](https://supabase.com) project
2. Run `supabase_schema.sql` in SQL Editor
3. Copy your project URL and anon key
4. Create `.env` file:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components
├── context/        # React contexts (Auth, Toast, Theme)
├── lib/            # Supabase client
├── pages/          # Page components
│   ├── auth/       # Login, Parent check
│   ├── dashboard/  # Dashboard
│   └── master/     # CRUD pages
├── App.jsx         # Main router
├── main.jsx        # Entry point
└── index.css       # Global styles
```

## 🛠 Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS 4
- **Icons**: FontAwesome
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Routing**: React Router DOM

## 📄 License

MIT License - feel free to use for your school!

---

Made with ❤️ for Indonesian Schools
