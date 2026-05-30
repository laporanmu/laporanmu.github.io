import { createContext, useContext, useState, useEffect } from "react"

const LanguageContext = createContext()

// ─── Modular Translations JSON Imports ─────────────────────────────────────────
import idCommon from "../locales/id/common.json"
import idNav from "../locales/id/nav.json"
import idGate from "../locales/id/gate.json"
import idBehavior from "../locales/id/behavior.json"

import enCommon from "../locales/en/common.json"
import enNav from "../locales/en/nav.json"
import enGate from "../locales/en/gate.json"
import enBehavior from "../locales/en/behavior.json"

import arCommon from "../locales/ar/common.json"
import arNav from "../locales/ar/nav.json"
import arGate from "../locales/ar/gate.json"
import arBehavior from "../locales/ar/behavior.json"

// Combine modular dictionaries into single namespace
const DICTIONARY = {
    id: { ...idCommon, ...idNav, ...idGate, ...idBehavior },
    en: { ...enCommon, ...enNav, ...enGate, ...enBehavior },
    ar: { ...arCommon, ...arNav, ...arGate, ...arBehavior }
}

const STORAGE_KEY = "app-language"

// O(1) Route-to-Translation-Key Mapping
const ROUTE_KEY_MAP = {
    "/dashboard": "nav.dashboard",
    "/boarding/gate": "nav.gate",
    "/boarding/behavior": "nav.behavior",
    "/boarding/dorms": "nav.dorms",
    "/boarding/health": "nav.health",
    "/academic/tahfidz": "nav.tahfidz",
    "/academic/attendance": "nav.attendance",
    "/academic/schedule": "nav.schedule",
    "/academic/raport": "nav.raport",
    "/academic/extracurricular": "nav.extracurricular",
    "/finance/invoices": "nav.invoices",
    "/finance/saving": "nav.saving",
    "/finance/payments": "nav.payments",
    "/master/students": "nav.students",
    "/master/teachers": "nav.teachers",
    "/master/classes": "nav.classes",
    "/master/subjects": "nav.subjects",
    "/master/poin": "nav.poin",
    "/master/academic-years": "nav.academic_years",
    "/master/enrollment": "nav.enrollment",
    "/boarding/counseling": "nav.counseling",
    "/academic/library": "nav.library",
    "/master/inventory": "nav.inventory",
    "/admin": "nav.admin_dashboard",
    "/admin/news": "nav.news",
    "/admin/ai-insights": "nav.ai_insights",
    "/admin/logs": "nav.logs",
    "/admin/users": "nav.users",
    "/admin/database": "nav.database",
    "/admin/storage": "nav.storage",
    "/admin/tasks": "nav.tasks",
    "/admin/playground": "nav.playground",
    "/admin/settings": "nav.settings",
    "/settings": "nav.settings"
}

function getTranslationKey(to) {
    if (!to) return null
    return ROUTE_KEY_MAP[to] || null
}

export function LanguageProvider({ children }) {
    const [language, setLanguageState] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) || "id"
        } catch {
            return "id"
        }
    })

    const setLanguage = (lang) => {
        if (!["id", "en", "ar"].includes(lang)) return
        setLanguageState(lang)
        try {
            localStorage.setItem(STORAGE_KEY, lang)
        } catch { /* ignore */ }
    }

    // Automatically toggle LTR / RTL when language changes
    useEffect(() => {
        const isRtl = language === "ar"
        document.documentElement.dir = isRtl ? "rtl" : "ltr"
        document.documentElement.lang = language
    }, [language])

    // Translate helper function with robust layered fallback (target -> en -> id -> raw key)
    const t = (key) => {
        if (!key) return ""
        return DICTIONARY[language]?.[key] || DICTIONARY["en"]?.[key] || DICTIONARY["id"]?.[key] || key
    }

    // Dynamic translation helpers for dynamic layouts
    const tNav = (item) => {
        if (!item) return ""
        const key = getTranslationKey(item.to)
        return key ? t(key) : item.label
    }

    // Translate page description in search dropdown
    const tNavDesc = (item) => {
        if (!item) return ""
        const key = getTranslationKey(item.to)
        if (!key) return item.desc || ""
        const descKey = key.replace('nav.', 'nav.desc.')
        const translated = t(descKey)
        return translated === descKey ? (item.desc || "") : translated
    }

    const tGroup = (key, defaultLabel) => {
        const translateKey = `section.${key}`
        const translation = t(translateKey)
        return translation === translateKey ? defaultLabel : translation
    }

    // Number translation helper: converts English digits to Eastern Arabic digits if current language is 'ar'
    const tNum = (val) => {
        if (val === null || val === undefined) return ""
        const str = val.toString()
        if (language === "ar") {
            const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"]
            return str.replace(/[0-9]/g, (w) => arabicDigits[+w])
        }
        return str
    }

    const dir = language === "ar" ? "rtl" : "ltr"

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, tNav, tNavDesc, tGroup, tNum, dir }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider")
    }
    return context
}
