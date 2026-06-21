import React, { useState, useEffect } from 'react';

export default function ReadingPlansAdmin() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [teachings, setTeachings] = useState([]); // List of internal teachings to link
    const [expandedDays, setExpandedDays] = useState({}); // Keep track of expanded day editors
    const [uploadingImage, setUploadingImage] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);

    // Firestore reference
    const db = window.firebase ? window.firebase.firestore() : null;

    useEffect(() => {
        if (!db) return;
        fetchPlans();
        fetchTeachings();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const snap = await db.collection('reading_plans').orderBy('createdAt', 'desc').get();
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPlans(list);
        } catch (e) {
            console.error("Error fetching reading plans:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeachings = async () => {
        try {
            const snap = await db.collection('teaching').orderBy('createdAt', 'desc').get();
            const list = snap.docs.map(doc => ({ id: doc.id, title: doc.data().title || 'Uten tittel', category: doc.data().category }));
            setTeachings(list);
        } catch (e) {
            console.error("Error fetching teachings:", e);
        }
    };

    const handleCreateNew = () => {
        const newPlan = {
            title: '',
            subtitle: '',
            imageUrl: '',
            description: '',
            durationDays: 1,
            days: [
                {
                    dayNumber: 1,
                    verses: '',
                    prayerFocus: '',
                    resources: []
                }
            ]
        };
        setCurrentPlan(newPlan);
        setExpandedDays({ 1: true });
        setIsEditing(true);
    };

    const handleEditPlan = (plan) => {
        // Ensure days array is well formed
        const days = Array.from({ length: plan.durationDays || 1 }, (_, i) => {
            const existingDay = plan.days?.find(d => d.dayNumber === i + 1);
            return existingDay || { dayNumber: i + 1, verses: '', prayerFocus: '', resources: [] };
        });
        setCurrentPlan({ ...plan, days });
        setExpandedDays({ 1: true });
        setIsEditing(true);
    };

    const handleDeletePlan = async (planId) => {
        if (!confirm("Er du sikker på at du vil slette denne leseplanen?")) return;
        try {
            await db.collection('reading_plans').doc(planId).delete();
            fetchPlans();
        } catch (e) {
            alert("Kunne ikke slette: " + e.message);
        }
    };

    const handleDurationChange = (e) => {
        const val = parseInt(e.target.value, 10) || 1;
        const newDays = [...currentPlan.days];
        
        if (val > newDays.length) {
            // Add days
            for (let i = newDays.length + 1; i <= val; i++) {
                newDays.push({
                    dayNumber: i,
                    verses: '',
                    prayerFocus: '',
                    resources: []
                });
            }
        } else if (val < newDays.length) {
            // Remove days
            newDays.splice(val);
        }

        setCurrentPlan({
            ...currentPlan,
            durationDays: val,
            days: newDays
        });
    };

    const handleDayFieldChange = (dayNum, field, value) => {
        const updatedDays = currentPlan.days.map(d => {
            if (d.dayNumber === dayNum) {
                return { ...d, [field]: value };
            }
            return d;
        });
        setCurrentPlan({ ...currentPlan, days: updatedDays });
    };

    const handleAddResource = (dayNum) => {
        const updatedDays = currentPlan.days.map(d => {
            if (d.dayNumber === dayNum) {
                const updatedRes = [
                    ...(d.resources || []),
                    {
                        type: 'article',
                        source: 'internal',
                        title: '',
                        url: '',
                        internalResourceId: ''
                    }
                ];
                return { ...d, resources: updatedRes };
            }
            return d;
        });
        setCurrentPlan({ ...currentPlan, days: updatedDays });
    };

    const handleResourceFieldChange = (dayNum, resIndex, field, value) => {
        const updatedDays = currentPlan.days.map(d => {
            if (d.dayNumber === dayNum) {
                const updatedRes = d.resources.map((r, idx) => {
                    if (idx === resIndex) {
                        const updated = { ...r, [field]: value };
                        // Automatically sync URL/Title if selecting internal teaching
                        if (field === 'internalResourceId' && r.source === 'internal') {
                            const selectedT = teachings.find(t => t.id === value);
                            if (selectedT) {
                                updated.title = selectedT.title;
                                updated.url = `/undervisning.html?id=${value}`;
                            }
                        }
                        return updated;
                    }
                    return r;
                });
                return { ...d, resources: updatedRes };
            }
            return d;
        });
        setCurrentPlan({ ...currentPlan, days: updatedDays });
    };

    const handleRemoveResource = (dayNum, resIndex) => {
        const updatedDays = currentPlan.days.map(d => {
            if (d.dayNumber === dayNum) {
                const updatedRes = d.resources.filter((_, idx) => idx !== resIndex);
                return { ...d, resources: updatedRes };
            }
            return d;
        });
        setCurrentPlan({ ...currentPlan, days: updatedDays });
    };

    const handleSavePlan = async (e) => {
        e.preventDefault();
        if (!currentPlan.title.trim()) {
            alert("Du må oppgi en tittel.");
            return;
        }

        try {
            const dataToSave = {
                title: currentPlan.title,
                subtitle: currentPlan.subtitle || '',
                imageUrl: currentPlan.imageUrl || '',
                description: currentPlan.description || '',
                durationDays: currentPlan.durationDays,
                days: currentPlan.days,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (currentPlan.id) {
                await db.collection('reading_plans').doc(currentPlan.id).update(dataToSave);
            } else {
                dataToSave.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('reading_plans').add(dataToSave);
            }

            setIsEditing(false);
            setCurrentPlan(null);
            fetchPlans();
        } catch (err) {
            alert("Kunne ikke lagre: " + err.message);
        }
    };

    const toggleDayExpanded = (dayNum) => {
        setExpandedDays(prev => ({
            ...prev,
            [dayNum]: !prev[dayNum]
        }));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            setUploadingImage(true);
            let fileToUpload = file;
            if (window.imageCompression) {
                try {
                    const options = { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true };
                    fileToUpload = await window.imageCompression(file, options);
                    fileToUpload = new File([fileToUpload], file.name, { type: file.type });
                } catch (compErr) {
                    console.warn("Compression failed, uploading original:", compErr);
                }
            }
            
            const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const path = `editor/reading-plans/${filename}`;
            
            if (!window.firebaseService || typeof window.firebaseService.uploadImage !== 'function') {
                throw new Error("Opplastingstjeneste er ikke tilgjengelig.");
            }
            
            const url = await window.firebaseService.uploadImage(fileToUpload, path);
            setCurrentPlan(prev => ({ ...prev, imageUrl: url }));
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Kunne ikke laste opp bilde: " + err.message);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleUnsplashClick = () => {
        if (window.unsplashManager) {
            window.unsplashManager.open((selection) => {
                if (selection && selection.url) {
                    setCurrentPlan(prev => ({ ...prev, imageUrl: selection.url }));
                }
            });
        } else {
            alert("Unsplash-søk er ikke tilgjengelig akkurat nå.");
        }
    };

    const handleAiGenerateClick = () => {
        const promptText = prompt("Beskriv bildet du ønsker at Gemini skal generere:\nF.eks: En fredelig bibel som ligger åpen på et trebord med sollys som strømmer inn gjennom et vindu");
        if (!promptText || !promptText.trim()) return;
        
        setAiGenerating(true);
        
        try {
            if (!window.firebase) {
                throw new Error("Firebase er ikke tilgjengelig.");
            }
            const callable = window.firebase.functions().httpsCallable('aiProcess');
            callable({
                task: 'generate_image',
                prompt: promptText
            }).then(result => {
                if (result.data && result.data.imageUrl) {
                    setCurrentPlan(prev => ({ ...prev, imageUrl: result.data.imageUrl }));
                } else {
                    throw new Error("Ingen bilde-URL mottatt fra serveren.");
                }
            }).catch(err => {
                console.error("Gemini image generation failed:", err);
                alert("Kunne ikke generere bilde: " + err.message);
            }).finally(() => {
                setAiGenerating(false);
            });
        } catch (err) {
            console.error("Gemini connection error:", err);
            alert("Tilkoblingsfeil: " + err.message);
            setAiGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="section-card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <div className="loader" style={{ margin: '0 auto 12px' }}></div>
                Laster leseplaner...
            </div>
        );
    }

    if (isEditing && currentPlan) {
        return (
            <div className="card modern" style={{ padding: '32px', margin: '20px auto', maxWidth: '960px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1B4965' }}>
                        {currentPlan.id ? 'Rediger leseplan' : 'Opprett ny leseplan'}
                    </h3>
                    <button onClick={() => { setIsEditing(false); setCurrentPlan(null); }} className="btn-secondary" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕ Avbryt</button>
                </div>

                <form onSubmit={handleSavePlan}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#0f172a' }}>Tittel *</label>
                            <input
                                type="text"
                                value={currentPlan.title}
                                onChange={(e) => setCurrentPlan({ ...currentPlan, title: e.target.value })}
                                placeholder="F.eks: En reise gjennom Johannesevangeliet"
                                required
                                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px' }}
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#0f172a' }}>Undertittel (valgfri)</label>
                            <input
                                type="text"
                                value={currentPlan.subtitle || ''}
                                onChange={(e) => setCurrentPlan({ ...currentPlan, subtitle: e.target.value })}
                                placeholder="F.eks: Oppdag styrke og mot i vanskelige tider"
                                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px' }}
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#0f172a' }}>Forsidebilde (valgfri)</label>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '16px', background: '#f8fafc' }}>
                                
                                {/* Preview Container if URL exists */}
                                {currentPlan.imageUrl && (
                                    <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#e2e8f0' }}>
                                        <img src={currentPlan.imageUrl} alt="Leseplan forsidebilde" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button 
                                            type="button" 
                                            onClick={() => setCurrentPlan(prev => ({ ...prev, imageUrl: '' }))}
                                            style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(15, 23, 42, 0.7)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.7)'}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px', margin: '0 auto' }}>delete</span>
                                        </button>
                                    </div>
                                )}

                                {/* Upload/Generation states */}
                                {(uploadingImage || aiGenerating) && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '20px', background: 'white', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                                        <div className="loader" style={{ width: '20px', height: '20px' }}></div>
                                        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                                            {uploadingImage ? 'Laster opp bilde...' : 'Gemini genererer bilde...'}
                                        </span>
                                    </div>
                                )}

                                {/* Buttons Grid */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('reading-plan-file-input').click()}
                                        disabled={uploadingImage || aiGenerating}
                                        className="btn btn-secondary"
                                        style={{ flex: '1 1 140px', padding: '10px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1.5px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#334155', transition: 'all 0.2s' }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload</span>
                                        Last opp
                                    </button>
                                    <input 
                                        type="file" 
                                        id="reading-plan-file-input" 
                                        accept="image/*" 
                                        onChange={handleFileUpload} 
                                        style={{ display: 'none' }} 
                                    />

                                    <button
                                        type="button"
                                        onClick={handleUnsplashClick}
                                        disabled={uploadingImage || aiGenerating}
                                        className="btn btn-secondary"
                                        style={{ flex: '1 1 140px', padding: '10px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1.5px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#334155', transition: 'all 0.2s' }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>image_search</span>
                                        Unsplash
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleAiGenerateClick}
                                        disabled={uploadingImage || aiGenerating}
                                        className="btn btn-secondary"
                                        style={{ flex: '1 1 140px', padding: '10px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1.5px solid #d17d39', background: '#fff7ed', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#d17d39', transition: 'all 0.2s' }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>auto_awesome</span>
                                        Generer med AI
                                    </button>
                                </div>

                                {/* Manual URL Input */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Eller skriv inn URL manuelt:</span>
                                    <input
                                        type="text"
                                        value={currentPlan.imageUrl || ''}
                                        onChange={(e) => setCurrentPlan({ ...currentPlan, imageUrl: e.target.value })}
                                        placeholder="F.eks: https://images.unsplash.com/photo-..."
                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#0f172a' }}>Beskrivelse</label>
                            <textarea
                                value={currentPlan.description}
                                onChange={(e) => setCurrentPlan({ ...currentPlan, description: e.target.value })}
                                rows="3"
                                placeholder="Hva handler denne leseplanen om?"
                                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', fontFamily: 'inherit', resize: 'vertical' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '14px', color: '#0f172a' }}>Varighet (antall dager)</label>
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={currentPlan.durationDays}
                                onChange={handleDurationChange}
                                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1B4965', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined">menu_book</span> Daglige andakter og vers
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {currentPlan.days.map((day, idx) => {
                                const isExpanded = !!expandedDays[day.dayNumber];
                                return (
                                    <div key={day.dayNumber} style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc' }}>
                                        {/* Day header toggle */}
                                        <div
                                            onClick={() => toggleDayExpanded(day.dayNumber)}
                                            style={{ padding: '14px 20px', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: isExpanded ? '1.5px solid #e2e8f0' : 'none' }}
                                        >
                                            <span style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className="material-symbols-outlined" style={{ color: '#d17d39', fontSize: '18px' }}>calendar_today</span> Dag {day.dayNumber}
                                                {day.verses && <span style={{ fontWeight: 500, fontSize: '13px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', marginLeft: '8px' }}>{day.verses}</span>}
                                            </span>
                                            <span className="material-symbols-outlined" style={{ color: '#94a3b8', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                                                expand_more
                                            </span>
                                        </div>

                                        {/* Day content panel */}
                                        {isExpanded && (
                                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '13px', color: '#334155' }}>Bibelvers for dagen *</label>
                                                    <input
                                                        type="text"
                                                        value={day.verses}
                                                        onChange={(e) => handleDayFieldChange(day.dayNumber, 'verses', e.target.value)}
                                                        placeholder="F.eks: Johannes 3:16-21, 1 Mos 1:1"
                                                        required
                                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                                                    />
                                                </div>

                                                <div>
                                                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '13px', color: '#334155' }}>Bønnefokus</label>
                                                    <textarea
                                                        value={day.prayerFocus}
                                                        onChange={(e) => handleDayFieldChange(day.dayNumber, 'prayerFocus', e.target.value)}
                                                        rows="3"
                                                        placeholder="Hva skal vi be for i dag?"
                                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', background: 'white', fontFamily: 'inherit', resize: 'vertical' }}
                                                    />
                                                </div>

                                                {/* Resources section */}
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                        <label style={{ fontWeight: 700, fontSize: '13px', color: '#334155' }}>Studieressurser / Dypdykk</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddResource(day.dayNumber)}
                                                            className="btn-secondary"
                                                            style={{ padding: '4px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                                        >
                                                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span> Legg til ressurs
                                                        </button>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {(day.resources || []).map((res, resIdx) => (
                                                            <div key={resIdx} style={{ display: 'grid', gridTemplateColumns: '120px 120px 1fr 1fr auto', gap: '8px', background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
                                                                {/* Type */}
                                                                <select
                                                                    value={res.type}
                                                                    onChange={(e) => handleResourceFieldChange(day.dayNumber, resIdx, 'type', e.target.value)}
                                                                    style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', background: 'white' }}
                                                                >
                                                                    <option value="article">Dokument/Artikkel</option>
                                                                    <option value="video">Video/YouTube</option>
                                                                    <option value="podcast">Podcast</option>
                                                                    <option value="web">Weblenke</option>
                                                                </select>

                                                                {/* Source */}
                                                                <select
                                                                    value={res.source}
                                                                    onChange={(e) => handleResourceFieldChange(day.dayNumber, resIdx, 'source', e.target.value)}
                                                                    style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', background: 'white' }}
                                                                >
                                                                    <option value="internal">Intern ressurser</option>
                                                                    <option value="external">Ekstern URL</option>
                                                                </select>

                                                                {/* Dynamic Source Field */}
                                                                {res.source === 'internal' ? (
                                                                    <select
                                                                        value={res.internalResourceId || ''}
                                                                        onChange={(e) => handleResourceFieldChange(day.dayNumber, resIdx, 'internalResourceId', e.target.value)}
                                                                        style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', background: 'white', gridColumn: 'span 2' }}
                                                                    >
                                                                        <option value="">Velg undervisningspost...</option>
                                                                        {teachings.map(t => (
                                                                            <option key={t.id} value={t.id}>[{t.category || 'Undervisning'}] {t.title}</option>
                                                                        ))}
                                                                    </select>
                                                                ) : (
                                                                    <>
                                                                        <input
                                                                            type="text"
                                                                            value={res.title}
                                                                            onChange={(e) => handleResourceFieldChange(day.dayNumber, resIdx, 'title', e.target.value)}
                                                                            placeholder="Tittel, f.eks: YouTube Video"
                                                                            style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                                                                        />
                                                                        <input
                                                                            type="url"
                                                                            value={res.url}
                                                                            onChange={(e) => handleResourceFieldChange(day.dayNumber, resIdx, 'url', e.target.value)}
                                                                            placeholder="https://..."
                                                                            style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                                                                        />
                                                                    </>
                                                                )}

                                                                {/* Remove */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveResource(day.dayNumber, resIdx)}
                                                                    style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                >
                                                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {(day.resources || []).length === 0 && (
                                                            <div style={{ textItems: 'center', fontSize: '12px', color: '#94a3b8', padding: '6px 0' }}>Ingen ressurser lagt til.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                        <button type="button" onClick={() => { setIsEditing(false); setCurrentPlan(null); }} className="btn btn-secondary" style={{ padding: '10px 24px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>Avbryt</button>
                        <button type="submit" className="btn btn-primary" style={{ padding: '10px 28px', borderRadius: '12px', background: 'linear-gradient(135deg, #d17d39, #b54d2b)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 10px rgba(209,125,57,0.2)' }}>Lagre leseplan</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'rgba(27, 73, 101, 0.08)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifycenter: 'center', color: '#1B4965' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '26px', margin: '0 auto' }}>auto_stories</span>
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1B4965', margin: 0 }}>Leseplaner</h2>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Opprett og administrer andaktsløp og leseplaner på tvers av nettstedet.</p>
                    </div>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="btn btn-primary"
                    style={{ padding: '12px 24px', borderRadius: '14px', background: 'linear-gradient(135deg, #d17d39, #b54d2b)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(209,125,57,0.2)' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span> Ny leseplan
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {plans.map(plan => (
                    <div key={plan.id} className="card modern" style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1B4965', margin: 0 }}>{plan.title}</h3>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#d17d39', background: '#fff7ed', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{plan.durationDays} dager</span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0, flexGrow: 1, lineheight: 1.5 }}>
                            {plan.description || 'Ingen beskrivelse.'}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '8px' }}>
                            <button
                                onClick={() => handleEditPlan(plan)}
                                className="btn-secondary"
                                style={{ border: '1.5px solid #cbd5e1', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'white', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span> Rediger
                            </button>
                            <button
                                onClick={() => handleDeletePlan(plan.id)}
                                className="btn-secondary"
                                style={{ border: '1.5px solid #fca5a5', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'white', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#ef4444' }}>delete</span> Slett
                            </button>
                        </div>
                    </div>
                ))}
                {plans.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', border: '1.5px dashed #cbd5e1', borderRadius: '20px', background: '#f8fafc', color: '#94a3b8' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>auto_stories</span>
                        <p style={{ fontWeight: 600, margin: 0 }}>Ingen leseplaner opprettet enda</p>
                        <p style={{ fontSize: '12px', margin: '4px 0 0' }}>Kom i gang ved å klikke på "+ Ny leseplan".</p>
                    </div>
                )}
            </div>
        </div>
    );
}
