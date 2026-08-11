import React, { useState, useEffect } from 'react';

/**
 * GoogleTasksIntegration Component
 * Self-contained component for Google Tasks Synchronization status, connection and configuration settings.
 * Mounts dynamically onto the Integrations section of HKM Studio.
 */
export default function GoogleTasksIntegration() {
    const [currentUser, setCurrentUser] = useState(null);
    const [googleConnected, setGoogleConnected] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Google Tasks config states
    const [showConfig, setShowConfig] = useState(false);
    const [configClientId, setConfigClientId] = useState('');
    const [configClientSecret, setConfigClientSecret] = useState('');
    const [savingConfig, setSavingConfig] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function' || firebase.apps.length === 0) {
                setTimeout(checkAuth, 100);
                return;
            }
            
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    setCurrentUser(user);
                    const db = firebase.firestore();

                    // Check Google Tasks integration state
                    const unsubscribeCreds = db.collection('user_google_credentials').doc(user.uid).onSnapshot(doc => {
                        if (doc.exists) {
                            const data = doc.data();
                            setGoogleConnected(!!data.tokens);
                        } else {
                            setGoogleConnected(false);
                        }
                        setLoading(false);
                    }, err => {
                        console.warn("[GoogleTasksIntegration] Google Credentials fetch ignored:", err);
                        setLoading(false);
                    });

                    // Listen to Google Tasks Config document
                    const unsubscribeConfig = db.collection('settings').doc('google_tasks_config').onSnapshot(doc => {
                        if (doc.exists) {
                            const data = doc.data();
                            setConfigClientId(data.clientId || '');
                            setConfigClientSecret(data.clientSecret || '');
                        }
                    }, err => {
                        console.warn("[GoogleTasksIntegration] Settings fetch ignored:", err);
                    });

                    return () => {
                        unsubscribeCreds();
                        unsubscribeConfig();
                    };
                } else {
                    setCurrentUser(null);
                    setLoading(false);
                }
            });
        };

        checkAuth();
    }, []);

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        if (!currentUser) return;
        setSavingConfig(true);
        try {
            const db = firebase.firestore();
            await db.collection('settings').doc('google_tasks_config').set({
                clientId: configClientId.trim(),
                clientSecret: configClientSecret.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentUser.uid
            }, { merge: true });
            alert('Google Tasks-konfigurasjon lagret!');
            setShowConfig(false);
        } catch (err) {
            console.error('[GoogleTasksIntegration] Error saving config:', err);
            alert('Kunne ikke lagre konfigurasjon: ' + err.message);
        } finally {
            setSavingConfig(false);
        }
    };

    const handleGoogleTasksAuth = () => {
        if (!currentUser) return;
        const hostname = window.location.hostname;
        const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';
        const functionsBase = isLocalDev 
            ? 'http://127.0.0.1:5001/his-kingdom-ministry/us-central1'
            : 'https://us-central1-his-kingdom-ministry.cloudfunctions.net';
            
        window.location.href = `${functionsBase}/googleTasksAuth?uid=${currentUser.uid}`;
    };

    const handleManualSync = async () => {
        if (!currentUser || syncing) return;
        setSyncing(true);
        try {
            const hostname = window.location.hostname;
            const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';
            const functionsBase = isLocalDev 
                ? 'http://127.0.0.1:5001/his-kingdom-ministry/us-central1'
                : 'https://us-central1-his-kingdom-ministry.cloudfunctions.net';

            const response = await fetch(`${functionsBase}/syncGoogleTasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ uid: currentUser.uid })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || 'Synkronisering feilet');
            }

            alert('Synkronisering med Google Tasks fullført!');
        } catch (err) {
            console.error('[GoogleTasksIntegration] Manual sync error:', err);
            alert('Kunne ikke synkronisere: ' + err.message);
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-6">
                <div className="loader w-6 h-6 border-2 border-[#1B4965] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!currentUser) {
        return null;
    }

    return (
        <div className="flex flex-col gap-6 w-full transform translate-z-0 backface-hidden">
            {/* Google Tasks Card */}
            <div className="card modern" style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: googleConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                            border: googleConnected ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)',
                            color: googleConnected ? '#4ade80' : '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '22px', display: 'block' }}>sync_alt</span>
                        </div>
                        <h3 className="card-title" style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-color, #f8fafc)' }}>Google Tasks</h3>
                    </div>
                    <span className="status-badge" style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '99px',
                        background: googleConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: googleConnected ? '#4ade80' : '#f87171',
                        border: googleConnected ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                        fontWeight: '700',
                        whiteSpace: 'nowrap'
                    }}>
                        {googleConnected ? 'Tilkoblet' : 'Frakoblet'}
                    </span>
                </div>
                <div className="card-body" style={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', justifyContent: 'space-between' }}>
                    <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary, #94a3b8)', lineHeight: '1.5' }}>
                        Synkroniser oppgaver og huskelister i HKM Studio med Google Tasks i sanntid.
                    </p>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
                        <button 
                            type="button"
                            onClick={() => setShowConfig(!showConfig)} 
                            className="btn btn-secondary"
                            title="Google Tasks API-innstillinger"
                            style={{
                                height: '42px',
                                width: '42px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                cursor: 'pointer',
                                flexShrink: 0
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px', display: 'block' }}>settings</span>
                        </button>

                        {googleConnected ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                                <button 
                                    type="button"
                                    onClick={handleManualSync} 
                                    disabled={syncing} 
                                    className="btn btn-primary"
                                    style={{
                                        height: '42px',
                                        flex: 1,
                                        minWidth: '140px',
                                        background: '#d17d39',
                                        color: '#ffffff',
                                        fontWeight: '700',
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        opacity: syncing ? 0.7 : 1
                                    }}
                                >
                                    <span className={`material-symbols-outlined ${syncing ? 'animate-spin' : ''}`} style={{ fontSize: '18px', display: 'block' }}>sync</span>
                                    {syncing ? 'Synkroniserer...' : 'Synkroniser nå'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleGoogleTasksAuth} 
                                    className="btn btn-secondary"
                                    style={{
                                        height: '42px',
                                        padding: '0 14px',
                                        borderRadius: '10px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Koble fra
                                </button>
                            </div>
                        ) : (
                            <button 
                                type="button"
                                onClick={handleGoogleTasksAuth} 
                                className="btn btn-primary"
                                style={{
                                    height: '42px',
                                    flex: 1,
                                    minWidth: '160px',
                                    background: '#d17d39',
                                    color: '#ffffff',
                                    fontWeight: '700',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    fontSize: '14px'
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', display: 'block' }}>link</span>
                                Koble til Google Tasks
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Google Tasks API Config Block */}
            {showConfig && (
                <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-200/80 shadow-inner flex flex-col gap-6 transform translate-z-0 backface-hidden" style={{ marginTop: '12px' }}>
                    <div className="flex justify-between items-start border-b border-slate-200/60 pb-4">
                        <div>
                            <h3 className="m-0 text-base font-bold text-[#1B4965] flex items-center gap-2">
                                <span className="material-symbols-outlined text-orange-500">settings</span>
                                Google Tasks API Innstillinger
                            </h3>
                            <p className="m-0 text-xs text-slate-500 mt-1 font-medium">Konfigurer Google Cloud credentials for synkronisering av huskelisten.</p>
                        </div>
                        <button onClick={() => setShowConfig(false)} className="border-none bg-transparent p-1 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors duration-250 flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {/* Guidance panel */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200/60 text-xs text-slate-600 leading-relaxed flex flex-col gap-3">
                            <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-slate-500">Instruksjoner for oppsett</h4>
                            <ol className="m-0 pl-4 flex flex-col gap-2 font-medium">
                                <li>Gå til <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-[#d17d39] font-semibold underline">Google Cloud Console</a>.</li>
                                <li>Velg eller opprett prosjektet <strong>his-kingdom-ministry</strong>.</li>
                                <li>Søk etter og aktiver <strong>Google Tasks API</strong> i API-biblioteket.</li>
                                <li>Gå til <strong>OAuth consent screen</strong> og konfigurer den.</li>
                                <li>Gå til <strong>Credentials</strong> &rarr; <strong>Create Credentials</strong> &rarr; <strong>OAuth client ID</strong> (Web application).</li>
                                <li>Under <strong>Authorized redirect URIs</strong>, legg inn nøyaktig disse to adressene:</li>
                            </ol>
                            
                            <div className="flex flex-col gap-2 mt-2">
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 flex flex-col gap-1">
                                    <span className="font-bold text-[10px] uppercase text-slate-400">Live Redirect URI:</span>
                                    <div className="flex justify-between items-center gap-2">
                                        <code className="text-[10px] text-slate-700 font-mono select-all break-all">https://us-central1-his-kingdom-ministry.cloudfunctions.net/googleTasksCallback</code>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText("https://us-central1-his-kingdom-ministry.cloudfunctions.net/googleTasksCallback");
                                                alert("Kopiert!");
                                            }} 
                                            className="px-2 py-1 rounded bg-[#1B4965] hover:bg-[#25638c] text-white text-[10px] font-bold cursor-pointer border-none transition-colors"
                                        >
                                            Kopier
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50 flex flex-col gap-1">
                                    <span className="font-bold text-[10px] uppercase text-slate-400">Lokal Redirect URI:</span>
                                    <div className="flex justify-between items-center gap-2">
                                        <code className="text-[10px] text-slate-700 font-mono select-all break-all">http://127.0.0.1:5001/his-kingdom-ministry/us-central1/googleTasksCallback</code>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText("http://127.0.0.1:5001/his-kingdom-ministry/us-central1/googleTasksCallback");
                                                alert("Kopiert!");
                                            }} 
                                            className="px-2 py-1 rounded bg-[#1B4965] hover:bg-[#25638c] text-white text-[10px] font-bold cursor-pointer border-none transition-colors"
                                        >
                                            Kopier
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Settings Form */}
                        <form onSubmit={handleSaveConfig} className="flex flex-col gap-5 bg-white rounded-2xl p-6 border border-slate-200/60">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Client ID (Klient-ID) *</label>
                                <input 
                                    type="text" 
                                    value={configClientId} 
                                    onChange={e => setConfigClientId(e.target.value)} 
                                    placeholder="Skriv inn Google Client ID..." 
                                    required 
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#d17d39] focus:ring-4 focus:ring-[#d17d39]/10 transition-all duration-300 outline-none font-medium text-slate-800 text-sm box-sizing-border-box"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Client Secret *</label>
                                <input 
                                    type="password" 
                                    value={configClientSecret} 
                                    onChange={e => setConfigClientSecret(e.target.value)} 
                                    placeholder="Skriv inn Google Client Secret..." 
                                    required 
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#d17d39] focus:ring-4 focus:ring-[#d17d39]/10 transition-all duration-300 outline-none font-medium text-slate-800 text-sm box-sizing-border-box"
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={savingConfig} 
                                className="w-full flex items-center justify-center gap-2 mt-2 px-5 py-3 rounded-full font-bold text-white bg-gradient-to-r from-[#d17d39] to-[#bd4f2a] hover:from-[#e28e4a] hover:to-[#ce5d37] shadow-sm hover:shadow active:scale-95 active:translate-y-0.5 transition-all duration-300 cursor-pointer border-none text-sm disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-base">save</span>
                                {savingConfig ? 'Lagrer...' : 'Lagre konfigurasjon'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
