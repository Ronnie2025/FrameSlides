import { get, set } from 'idb-keyval';
import { Session } from '../types';

const STORAGE_KEY = 'frameslides_sessions';

export const saveSessions = async (sessions: Session[]): Promise<void> => {
    try {
        // We can now safely store the full session data including images
        await set(STORAGE_KEY, sessions);
    } catch (error) {
        console.error('Failed to save sessions to IndexedDB:', error);
    }
};

export const loadSessions = async (): Promise<Session[]> => {
    try {
        const sessions = await get<Session[]>(STORAGE_KEY);
        return sessions || [];
    } catch (error) {
        console.error('Failed to load sessions from IndexedDB:', error);
        return [];
    }
};
