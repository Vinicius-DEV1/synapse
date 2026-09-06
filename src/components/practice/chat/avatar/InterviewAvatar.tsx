import { useEffect, useRef, useState, type MutableRefObject } from 'react';

interface InterviewAvatarProps {
  isPlaying: boolean;
  isRecording: boolean;
  playbackAnalyserRef: MutableRefObject<AnalyserNode | null>;
  jobTitle?: string;
  interviewerName?: string;
}

export function InterviewAvatar({
  isPlaying,
  isRecording,
  playbackAnalyserRef,
  jobTitle,
  interviewerName = 'Carlos Mendes'
}: InterviewAvatarProps) {
  // Viseme & mouth states
  const [mouthOpen, setMouthOpen] = useState(0);       // 0 (closed) to 1 (fully open)
  const [mouthWide, setMouthWide] = useState(0);       // -0.4 (round 'O/U') to 0.6 (wide 'E/I')
  
  // Facial animation states
  const [isBlinking, setIsBlinking] = useState(false);
  const [pupilShift, setPupilShift] = useState({ x: 0, y: 0 });
  const [headPose, setHeadPose] = useState({ nodY: 0, tiltDeg: 0 });

  const animFrameRef = useRef<number | undefined>(undefined);
  const smoothMouthOpenRef = useRef(0);
  const smoothMouthWideRef = useRef(0);
  const maxEnergyRef = useRef(40);
  const speechTimeRef = useRef(0);

  // 1. Natural eye blinking loop (every 3.2s - 5.5s)
  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout;
    const scheduleBlink = () => {
      const delay = 2800 + Math.random() * 3000;
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 150);
      }, delay);
    };

    scheduleBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  // 2. Realistic eye saccades (subtle micro-shifts looking thoughtfully at candidate)
  useEffect(() => {
    let saccadeTimeout: NodeJS.Timeout;
    const scheduleSaccade = () => {
      const delay = 2000 + Math.random() * 2500;
      saccadeTimeout = setTimeout(() => {
        // Subtle shift around center (-1.5px to +1.5px)
        const targetX = (Math.random() - 0.5) * 2.8;
        const targetY = (Math.random() - 0.5) * 1.6;
        setPupilShift({ x: targetX, y: targetY });

        // Return towards direct eye contact after a brief glance
        setTimeout(() => {
          setPupilShift({ x: targetX * 0.25, y: targetY * 0.25 });
        }, 900);

        scheduleSaccade();
      }, delay);
    };

    scheduleSaccade();
    return () => clearTimeout(saccadeTimeout);
  }, []);

  // 3. Audio Viseme Engine & Procedural Lip-Sync
  useEffect(() => {
    let active = true;

    const updateAnimation = () => {
      if (!active) return;
      const now = performance.now() / 1000;

      let targetOpen = 0;
      let targetWide = 0;

      if (isPlaying) {
        speechTimeRef.current += 0.016;
        const t = speechTimeRef.current;

        let hasFftData = false;
        let lowEnergy = 0;
        let midEnergy = 0;
        let highEnergy = 0;

        if (playbackAnalyserRef.current) {
          try {
            const analyser = playbackAnalyserRef.current;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray as unknown as Uint8Array<ArrayBuffer>);

            // Low frequency (100 - 800 Hz): Fundamental jaw opening & open vowels (A, O)
            let sumLow = 0;
            const lowEnd = Math.min(10, bufferLength);
            for (let i = 1; i < lowEnd; i++) sumLow += dataArray[i];
            lowEnergy = sumLow / (lowEnd - 1);

            // Mid frequency (800 - 2400 Hz): Formant F2, mouth shape & vowels
            let sumMid = 0;
            const midEnd = Math.min(26, bufferLength);
            for (let i = lowEnd; i < midEnd; i++) sumMid += dataArray[i];
            midEnergy = sumMid / (midEnd - lowEnd);

            // High frequency (2400 - 5500 Hz): Fricatives, sibilants (S, T, Z, teeth showing)
            let sumHigh = 0;
            const highEnd = Math.min(55, bufferLength);
            for (let i = midEnd; i < highEnd; i++) sumHigh += dataArray[i];
            highEnergy = sumHigh / (highEnd - midEnd);

            const totalEnergy = (lowEnergy * 1.3 + midEnergy * 1.0 + highEnergy * 0.8) / 3.1;
            if (totalEnergy > 5) {
              hasFftData = true;
              maxEnergyRef.current = Math.max(maxEnergyRef.current * 0.99, totalEnergy, 35);
              const normalized = Math.min(1, Math.max(0, (totalEnergy - 4) / (maxEnergyRef.current * 0.85)));

              // Syllabic envelope modulation (~4Hz natural speech cadence)
              const syllableMod = 0.75 + Math.sin(t * 18) * 0.25 + Math.sin(t * 9) * 0.15;
              targetOpen = Math.min(1, Math.max(0, normalized * syllableMod));

              // Formant ratio drives lip stretch (wide vs round)
              const highRatio = (highEnergy + 1) / (lowEnergy + 1);
              targetWide = Math.min(0.55, Math.max(-0.35, (highRatio - 0.75) * 0.9));
            }
          } catch {
            // fallback to procedural
          }
        }

        // Procedural speech fallback if audio buffer gap or low FFT amplitude occurs
        if (!hasFftData) {
          // Dynamic phonetic syllable generator (articulates distinct syllables ~4.2 Hz)
          const primaryBeat = Math.sin(t * 16);
          const secondaryHarmonic = Math.sin(t * 8.5) * 0.5;
          const tertiaryVariation = Math.cos(t * 22) * 0.3;
          const combinedWave = (primaryBeat + secondaryHarmonic + tertiaryVariation) / 1.8;
          
          targetOpen = Math.max(0, Math.min(0.9, combinedWave > 0 ? combinedWave * 0.85 + 0.15 : 0.05));
          targetWide = Math.sin(t * 11) * 0.35;
        }

        // Realistic Head nod & tilt while articulating
        const speechNod = Math.sin(t * 5) * 2.5 * targetOpen + Math.sin(now * 1.5) * 1.0;
        const speechTilt = Math.sin(t * 3) * 1.8 * targetOpen;
        setHeadPose({ nodY: speechNod, tiltDeg: speechTilt });
      } else {
        // Rest / Listening state
        targetOpen = 0;
        targetWide = 0;

        if (isRecording) {
          // Attentive listening posture: slight tilt and subtle listening nods
          const listenTilt = -2.2;
          const listenNod = Math.sin(now * 2.5) * 1.8 + 2;
          setHeadPose({ nodY: listenNod, tiltDeg: listenTilt });
        } else {
          // Subtle resting breathing rhythm
          const breathNod = Math.sin(now * 1.2) * 1.2;
          const breathTilt = Math.sin(now * 0.8) * 0.6;
          setHeadPose({ nodY: breathNod, tiltDeg: breathTilt });
        }
      }

      // Smooth spring interpolation (Fast attack, natural decay)
      const openSmoothing = targetOpen > smoothMouthOpenRef.current ? 0.48 : 0.35;
      smoothMouthOpenRef.current += (targetOpen - smoothMouthOpenRef.current) * openSmoothing;
      if (smoothMouthOpenRef.current < 0.01) smoothMouthOpenRef.current = 0;
      setMouthOpen(smoothMouthOpenRef.current);

      smoothMouthWideRef.current += (targetWide - smoothMouthWideRef.current) * 0.28;
      setMouthWide(smoothMouthWideRef.current);

      animFrameRef.current = requestAnimationFrame(updateAnimation);
    };

    animFrameRef.current = requestAnimationFrame(updateAnimation);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isRecording, playbackAnalyserRef]);

  // Geometric coordinates for dynamic mouth & jaw articulation
  const jawDrop = mouthOpen * 7.5;
  const mouthWidthHalf = 13 + mouthWide * 8 + mouthOpen * 4;
  const cornerL = { x: 150 - mouthWidthHalf, y: 169 };
  const cornerR = { x: 150 + mouthWidthHalf, y: 169 };
  const upperLipY = 169 - mouthOpen * 3.5;
  const lowerLipY = 169 + mouthOpen * 15;

  // Eyebrow dynamic lift on speech emphasis
  const eyebrowLift = isPlaying ? -mouthOpen * 2.8 : 0;

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-lg select-none">
      {/* Ambient Pulsing Aura */}
      <div
        className={`absolute -inset-10 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
          isRecording
            ? 'bg-purple-600/35 scale-110 opacity-90'
            : isPlaying
            ? 'bg-sky-500/40 scale-125 opacity-100'
            : 'bg-brand-500/15 scale-95 opacity-50'
        }`}
      />

      {/* Avatar Container with Real-time Head Physics & Tilt */}
      <div
        className="relative z-10 w-72 h-80 flex items-center justify-center transition-transform duration-100 ease-out"
        style={{
          transform: `translateY(${headPose.nodY}px) rotate(${headPose.tiltDeg}deg)`
        }}
      >
        <svg
          viewBox="0 0 300 320"
          className="w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.65)]"
        >
          <defs>
            {/* Skin Gradient */}
            <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fad5be" />
              <stop offset="100%" stopColor="#e3b696" />
            </linearGradient>

            {/* Skin Shadow (Under Chin / Neck) */}
            <linearGradient id="neckGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cf9e7e" />
              <stop offset="100%" stopColor="#bc8867" />
            </linearGradient>

            {/* Suit Gradient */}
            <linearGradient id="suitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Hair Gradient with Subtle Highlights */}
            <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#373742" />
              <stop offset="50%" stopColor="#25252d" />
              <stop offset="100%" stopColor="#16161a" />
            </linearGradient>

            {/* Deep Oral Cavity Depth */}
            <radialGradient id="mouthInterior" cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#4a0f19" />
              <stop offset="60%" stopColor="#2e070e" />
              <stop offset="100%" stopColor="#170306" />
            </radialGradient>

            {/* Enamel Teeth Gradient */}
            <linearGradient id="teethGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="75%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            {/* Organic Tongue Gradient */}
            <linearGradient id="tongueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>

            {/* Lip Natural Gradient */}
            <linearGradient id="lipGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#be5c48" />
              <stop offset="100%" stopColor="#963b28" />
            </linearGradient>
          </defs>

          {/* Torso & Shoulders (Business Suit) */}
          <path
            d="M 60 320 C 65 245 100 225 150 225 C 200 225 235 245 240 320 Z"
            fill="url(#suitGrad)"
            stroke="#334155"
            strokeWidth="2"
          />

          {/* White Shirt Collar & Lapel */}
          <polygon points="150,225 125,270 150,290 175,270" fill="#f8fafc" />
          <polygon points="144,250 150,290 156,250" fill="#2563eb" /> {/* Royal Blue Silk Tie */}
          <path d="M 105 232 L 138 275 L 125 278 Z" fill="#334155" />
          <path d="M 195 232 L 162 275 L 175 278 Z" fill="#334155" />

          {/* Neck with Shadow */}
          <rect
            x="132"
            y="185"
            width="36"
            height="45"
            rx="6"
            fill="url(#neckGrad)"
          />

          {/* Ears */}
          <ellipse cx="98" cy="148" rx="9" ry="14" fill="#e2b595" />
          <ellipse cx="202" cy="148" rx="9" ry="14" fill="#e2b595" />

          {/* Head & Moving Jaw Shape (Chin articulates down with speech) */}
          <path
            d={`M 100 135 C 100 85 200 85 200 135 C 200 185 185 ${205 + jawDrop} 150 ${205 + jawDrop} C 115 ${205 + jawDrop} 100 185 100 135 Z`}
            fill="url(#skinGrad)"
          />

          {/* Hair (Professional Styled Coiffure) */}
          <path
            d="M 96 125 C 95 80 130 60 155 60 C 185 60 205 75 205 120 C 195 105 185 102 165 100 C 140 98 120 105 96 125 Z"
            fill="url(#hairGrad)"
          />
          {/* Hair Sideburns */}
          <path d="M 98 120 L 101 145 L 105 140 Z" fill="url(#hairGrad)" />
          <path d="M 202 120 L 199 145 L 195 140 Z" fill="url(#hairGrad)" />

          {/* Eyebrows (Dynamic lift on emphasis + tilt when listening) */}
          <path
            d={
              isRecording
                ? `M 115 ${125 + eyebrowLift} Q 128 ${118 + eyebrowLift} 140 ${124 + eyebrowLift}`
                : `M 115 ${123 + eyebrowLift} Q 128 ${119 + eyebrowLift} 140 ${123 + eyebrowLift}`
            }
            stroke="#18181b"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={
              isRecording
                ? `M 160 ${124 + eyebrowLift} Q 172 ${118 + eyebrowLift} 185 ${125 + eyebrowLift}`
                : `M 160 ${123 + eyebrowLift} Q 172 ${119 + eyebrowLift} 185 ${123 + eyebrowLift}`
            }
            stroke="#18181b"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Eyes (Open with Saccades vs Blinking) */}
          {isBlinking ? (
            <>
              {/* Closed Eyes Curvature */}
              <path d="M 118 138 Q 128 143 138 138" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M 162 138 Q 172 143 182 138" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              {/* Left Eye Sclera & Moving Pupil */}
              <ellipse cx="128" cy="137" rx="8.5" ry="6.5" fill="#ffffff" />
              <circle cx={128 + pupilShift.x} cy={137 + pupilShift.y} r="4.3" fill="#1e293b" />
              <circle cx={128 + pupilShift.x + 1.4} cy={137 + pupilShift.y - 1.4} r="1.5" fill="#ffffff" />

              {/* Right Eye Sclera & Moving Pupil */}
              <ellipse cx="172" cy="137" rx="8.5" ry="6.5" fill="#ffffff" />
              <circle cx={172 + pupilShift.x} cy={137 + pupilShift.y} r="4.3" fill="#1e293b" />
              <circle cx={172 + pupilShift.x + 1.4} cy={137 + pupilShift.y - 1.4} r="1.5" fill="#ffffff" />
            </>
          )}

          {/* Glasses Frame (Modern Executive Frame) */}
          <rect
            x="114"
            y="126"
            width="28"
            height="22"
            rx="5"
            fill="none"
            stroke="#475569"
            strokeWidth="2.2"
          />
          <rect
            x="158"
            y="126"
            width="28"
            height="22"
            rx="5"
            fill="none"
            stroke="#475569"
            strokeWidth="2.2"
          />
          <line x1="142" y1="135" x2="158" y2="135" stroke="#475569" strokeWidth="2.2" />

          {/* Nose */}
          <path
            d="M 148 142 L 152 156 L 145 158"
            stroke="#c88b68"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />

          {/* MOUTH & LIP-SYNC RENDERING */}
          {mouthOpen > 0.04 ? (
            <g id="articulatingMouth">
              {/* 1. Deep Oral Cavity */}
              <path
                d={`M ${cornerL.x} ${cornerL.y} Q 150 ${upperLipY + 2} ${cornerR.x} ${cornerR.y} Q 150 ${lowerLipY + 1} ${cornerL.x} ${cornerL.y} Z`}
                fill="url(#mouthInterior)"
              />

              {/* 2. Pearly Upper Teeth Row */}
              <path
                d={`M ${150 - mouthWidthHalf * 0.72} 168.5 Q 150 ${upperLipY + 2} ${150 + mouthWidthHalf * 0.72} 168.5 L ${150 + mouthWidthHalf * 0.65} ${168.5 + Math.min(mouthOpen * 6.5, 5)} Q 150 ${168.5 + Math.min(mouthOpen * 6.5, 5) + 0.8} ${150 - mouthWidthHalf * 0.65} ${168.5 + Math.min(mouthOpen * 6.5, 5)} Z`}
                fill="url(#teethGrad)"
              />

              {/* Subtle teeth segment dividers */}
              {mouthOpen > 0.15 && (
                <>
                  <line x1="150" y1="168" x2="150" y2={168 + Math.min(mouthOpen * 6, 4.5)} stroke="#94a3b8" strokeWidth="0.6" strokeOpacity="0.7" />
                  <line x1="145" y1="168.5" x2="145" y2={168.5 + Math.min(mouthOpen * 5.5, 4)} stroke="#94a3b8" strokeWidth="0.5" strokeOpacity="0.5" />
                  <line x1="155" y1="168.5" x2="155" y2={168.5 + Math.min(mouthOpen * 5.5, 4)} stroke="#94a3b8" strokeWidth="0.5" strokeOpacity="0.5" />
                </>
              )}

              {/* 3. Lower Teeth Row (Appears on open vowels / wide syllables) */}
              {mouthOpen > 0.32 && (
                <path
                  d={`M ${150 - mouthWidthHalf * 0.6} ${lowerLipY - 1} Q 150 ${lowerLipY - Math.min((mouthOpen - 0.3) * 6, 3.5)} ${150 + mouthWidthHalf * 0.6} ${lowerLipY - 1} Z`}
                  fill="url(#teethGrad)"
                />
              )}

              {/* 4. Organic Tongue Mound */}
              {mouthOpen > 0.12 && (
                <path
                  d={`M ${150 - mouthWidthHalf * 0.55} ${lowerLipY} Q 150 ${lowerLipY - mouthOpen * 5.5} ${150 + mouthWidthHalf * 0.55} ${lowerLipY} Z`}
                  fill="url(#tongueGrad)"
                />
              )}

              {/* 5. Natural Upper Lip (Cupid's Bow Contour) */}
              <path
                d={`M ${cornerL.x - 1} ${cornerL.y} C ${cornerL.x + 4} ${upperLipY - 1}, 145 ${upperLipY - 2.5}, 150 ${upperLipY - 0.5} C 155 ${upperLipY - 2.5}, ${cornerR.x - 4} ${upperLipY - 1}, ${cornerR.x + 1} ${cornerR.y} Q 150 ${upperLipY + 2} ${cornerL.x - 1} ${cornerL.y} Z`}
                fill="url(#lipGrad)"
              />

              {/* 6. Natural Lower Lip (Curved fleshy drop) */}
              <path
                d={`M ${cornerL.x - 1} ${cornerL.y} Q 150 ${lowerLipY} ${cornerR.x + 1} ${cornerR.y} C ${cornerR.x - 3} ${lowerLipY + 3.5}, 156 ${lowerLipY + 4.5}, 150 ${lowerLipY + 4.5} C 144 ${lowerLipY + 4.5}, ${cornerL.x + 3} ${lowerLipY + 3.5}, ${cornerL.x - 1} ${cornerL.y} Z`}
                fill="url(#lipGrad)"
              />

              {/* 7. Lower Lip Specular 3D Highlight */}
              <ellipse
                cx="150"
                cy={lowerLipY + 2.2}
                rx={mouthWidthHalf * 0.4}
                ry="1"
                fill="#ffffff"
                fillOpacity="0.35"
              />
            </g>
          ) : (
            /* Rest / Natural closed lips with friendly professional smile */
            <g id="restingLips">
              {/* Upper lip shadow line */}
              <path
                d="M 136 170 Q 143 168.2 150 170 Q 157 168.2 164 170"
                stroke="#881337"
                strokeWidth="2.6"
                strokeLinecap="round"
                fill="none"
              />
              {/* Lower lip soft boundary */}
              <path
                d="M 141 173.2 Q 150 175.2 159 173.2"
                stroke="#c88b68"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Floating Recruiter HUD */}
      <div className="relative z-10 flex flex-col items-center mt-3 text-center">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 shadow-lg">
          <span
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isRecording
                ? 'bg-purple-400 animate-pulse'
                : isPlaying
                ? 'bg-sky-400 animate-ping'
                : 'bg-emerald-400'
            }`}
          />
          <span className="text-xs font-semibold text-white/90">{interviewerName}</span>
          <span className="text-[10px] text-white/50 border-l border-white/10 pl-2">Entrevistador</span>
        </div>

        {jobTitle && (
          <p className="text-xs text-white/60 mt-1.5 font-medium tracking-wide">
            Vaga: <span className="text-white/90 font-semibold">{jobTitle}</span>
          </p>
        )}
      </div>
    </div>
  );
}
