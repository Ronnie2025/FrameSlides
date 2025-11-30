import React, { useEffect, useRef } from 'react';
import { Settings } from '../types';
import { jwtDecode } from "jwt-decode";

interface LoginButtonProps {
    settings: Settings;
    onLoginSuccess: (user: any) => void;
    onLogout: () => void;
    user: any;
}

const LoginButton: React.FC<LoginButtonProps> = ({ settings, onLoginSuccess, onLogout, user }) => {
    const buttonRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user || !settings.googleClientId || !buttonRef.current) return;

        const win = window as any;
        if (win.google) {
            win.google.accounts.id.initialize({
                client_id: settings.googleClientId,
                callback: (response: any) => {
                    try {
                        const decoded = jwtDecode(response.credential);
                        onLoginSuccess(decoded);
                    } catch (e) {
                        console.error("Login Failed", e);
                    }
                }
            });
            win.google.accounts.id.renderButton(
                buttonRef.current,
                { theme: "outline", size: "large" }
            );
        }
    }, [settings.googleClientId, user]);

    if (user) {
        return (
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm">
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                    <button onClick={onLogout} className="text-xs text-rose-500 hover:underline text-left">退出登录</button>
                </div>
            </div>
        );
    }

    if (!settings.googleClientId) {
        return (
            <div className="text-xs text-rose-500 px-4">
                配置错误: 缺少 Client ID
            </div>
        );
    }

    return <div ref={buttonRef} className="min-h-[40px]" />;
};

export default LoginButton;
