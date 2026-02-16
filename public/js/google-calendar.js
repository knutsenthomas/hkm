import { firebaseService } from './firebase-service.js';

class GoogleCalendar {
    constructor() {
        this.apiKey = null;
        this.calendarId = null;
        this.isInitialized = false;
    }

    async init() {
        if (!firebaseService.isInitialized) {
            return;
        }
        try {
            const settings = await firebaseService.getPageContent('settings_gcal');
            if (settings && settings.apiKey && settings.calendarId) {
                this.apiKey = settings.apiKey;
                this.calendarId = settings.calendarId;
                this.isInitialized = true;
            } else {
                // API Key or Calendar ID missing
            }
        } catch (error) {
            console.error("Error loading Google Calendar settings:", error);
        }
    }

    async getUpcomingEvents(maxResults = 10) {
        if (!this.isInitialized) {
            return [];
        }

        const now = new Date().toISOString();
        const url = `https://www.googleapis.com/calendar/v3/calendars/${this.calendarId}/events?key=${this.apiKey}&timeMin=${now}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error fetching Google Calendar events:", errorData.error.message);
                throw new Error(`Google Calendar API error: ${errorData.error.message}`);
            }
            const data = await response.json();
            return data.items || [];
        } catch (error) {
            console.error("Failed to fetch upcoming events:", error);
            return [];
        }
    }

    async getAllEvents(timeMin, timeMax) {
        if (!this.isInitialized) {
            return [];
        }

        let url = `https://www.googleapis.com/calendar/v3/calendars/${this.calendarId}/events?key=${this.apiKey}&singleEvents=true&orderBy=startTime`;
        if (timeMin) {
            url += `&timeMin=${timeMin}`;
        }
        if (timeMax) {
            url += `&timeMax=${timeMax}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error fetching Google Calendar events:", errorData.error.message);
                throw new Error(`Google Calendar API error: ${errorData.error.message}`);
            }
            const data = await response.json();
            return data.items || [];
        } catch (error) {
            console.error("Failed to fetch all events:", error);
            return [];
        }
    }
}

export const googleCalendar = new GoogleCalendar();
