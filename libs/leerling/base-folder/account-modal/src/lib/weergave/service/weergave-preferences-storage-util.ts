import { Preferences } from '@capacitor/preferences';
import { Theme } from '../theme';

const themeKey = 'SLL-settings-theme';
const systeemKey = 'SLL-settings-systeem';
const dyslexieKey = 'SLL-settings-dyslexie';
const onvoldoendeRoodKey = 'SLL-settings-onvoldoende-rood';

export const saveThemePreference = async (theme: Theme) => {
    await Preferences.set({
        key: themeKey,
        value: theme
    });
};

export const getThemePreference = async (): Promise<Theme> => {
    const theme = await Preferences.get({ key: themeKey });
    return (theme.value as Theme) ?? 'light';
};

export const saveSysteemPreference = async (voorkeur: boolean) => {
    await Preferences.set({
        key: systeemKey,
        value: voorkeur.toString()
    });
};

export const getSysteemPreference = async (): Promise<boolean | null> => {
    const res = (await Preferences.get({ key: systeemKey })).value;
    if (!res) return null;
    return res === 'true';
};

export const saveDyslexiePreference = async (voorkeur: boolean) => {
    await Preferences.set({
        key: dyslexieKey,
        value: voorkeur.toString()
    });
};

export const getDyslexiePreference = async (): Promise<boolean | null> => {
    const res = (await Preferences.get({ key: dyslexieKey })).value;
    if (!res) return null;
    return res === 'true';
};

export const saveOnvoldoendePreference = async (voorkeur: boolean) => {
    await Preferences.set({
        key: onvoldoendeRoodKey,
        value: voorkeur.toString()
    });
};

export const getOnvoldoendePreference = async (): Promise<boolean | null> => {
    const res = (await Preferences.get({ key: onvoldoendeRoodKey })).value;
    if (!res) return null;
    return res === 'true';
};
