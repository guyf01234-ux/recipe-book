'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, ChefHat, Heart } from 'lucide-react';

export const BOOK_PHOTOS = [
  '/book-photos/photo-1.jpg',
  '/book-photos/photo-2.jpg',
  '/book-photos/photo-3.jpg',
  '/book-photos/photo-4.jpg',
  '/book-photos/photo-5.jpg',
  '/book-photos/photo-6.jpg',
  '/book-photos/photo-7.jpg',
  '/book-photos/photo-8.jpg',
];

interface BookOpeningIntroProps {
  onComplete: () => void;
}

export const BookOpeningIntro: React.FC<BookOpeningIntroProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'closed' | 'opening' | 'opened' | 'zooming' | 'done'>('closed');
  const [particles, setParticles] = useState<Array<{ id: number; top: number; left: number; size: number; duration: number; delay: number }>>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string>(BOOK_PHOTOS[0]);

  useEffect(() => {
    // Pick a random photo from the collection each time the book opens
    const randomIndex = Math.floor(Math.random() * BOOK_PHOTOS.length);
    setSelectedPhoto(BOOK_PHOTOS[randomIndex]);

    // Generate gold sparkles
    const p = Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 6 + 3,
      duration: Math.random() * 2 + 2,
      delay: Math.random() * 1.5,
    }));
    setParticles(p);

    // Sequence timeline
    const t1 = setTimeout(() => {
      setStage('opening');
    }, 1400);

    const t2 = setTimeout(() => {
      setStage('opened');
    }, 4400);

    const t3 = setTimeout(() => {
      setStage('zooming');
    }, 7600);

    const t4 = setTimeout(() => {
      setStage('done');
      onComplete();
    }, 9200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  if (stage === 'done') return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-stone-950 via-[#180e08] to-stone-950 overflow-hidden transition-opacity duration-1000 select-none ${
        stage === 'zooming' ? 'opacity-0 pointer-events-none scale-125' : 'opacity-100'
      }`}
      style={{ perspective: '2200px' }}
    >
      {/* Background ambient light */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.15)_0%,rgba(0,0,0,0.85)_75%)] pointer-events-none" />

      {/* Floating Gold Sparkle Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-amber-300 pointer-events-none animate-pulse shadow-[0_0_12px_#fbbf24]"
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: stage === 'opening' || stage === 'opened' ? 0.8 : 0.2,
            transition: 'opacity 1s ease',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Skip button */}
      <button
        onClick={onComplete}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-amber-200/80 hover:text-amber-100 border border-amber-500/20 text-xs font-medium backdrop-blur-md transition"
      >
        <span>דלג אל המתכונים</span>
        <ArrowLeft className="w-3.5 h-3.5" />
      </button>

      {/* 3D BOOK CONTAINER */}
      <div
        className={`relative transition-all duration-1500 ease-out ${
          stage === 'zooming' ? 'scale-[1.8] translate-y-10' : 'scale-100'
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform:
            stage === 'closed'
              ? 'rotateX(18deg) rotateY(-8deg) rotateZ(0deg)'
              : 'rotateX(10deg) rotateY(0deg) rotateZ(0deg)',
          transition: 'transform 2s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      >
        {/* Book shadow on table */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-[520px] h-[70px] bg-black/70 rounded-[100%] blur-2xl pointer-events-none" />

        {/* THE ENTIRE BOOK WRAPPER */}
        <div
          className="relative w-[340px] sm:w-[430px] h-[500px] sm:h-[560px] rounded-r-2xl"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* BACK COVER (Always underneath) */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#1f0d07] via-[#2f1309] to-[#240e06] border-4 border-[#78350f] shadow-2xl"
            style={{
              transform: 'translateZ(-16px)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9), inset 0 0 40px rgba(0,0,0,0.8)',
            }}
          />

          {/* INSIDE PAGES BASE (The stationary right page featuring the randomly selected photo) */}
          <div
            className="absolute inset-2 sm:inset-3 rounded-r-xl bg-[#fbf6e9] border border-[#e2d5b8] shadow-inner p-4 sm:p-6 flex flex-col justify-between overflow-hidden"
            style={{
              backgroundImage: `radial-gradient(#eadaaa 1px, transparent 1px), linear-gradient(to right, #eeddbb, #fdfaf2 10%, #fdfaf2 90%, #eeddbb)`,
              backgroundSize: '20px 20px, 100% 100%',
              boxShadow: 'inset 15px 0 30px rgba(120,53,15,0.15), 5px 5px 20px rgba(0,0,0,0.3)',
            }}
          >
            {/* Vintage Page Content with Photo */}
            <div className="border-2 border-[#caa469]/40 rounded-lg p-3 sm:p-4 h-full flex flex-col justify-between relative">
              {/* Corner Ornaments */}
              <div className="absolute top-1 right-1 text-amber-700/40 text-xs">❦</div>
              <div className="absolute top-1 left-1 text-amber-700/40 text-xs">❦</div>
              <div className="absolute bottom-1 right-1 text-amber-700/40 text-xs">❦</div>
              <div className="absolute bottom-1 left-1 text-amber-700/40 text-xs">❦</div>

              {/* Header Title */}
              <div className="text-center space-y-0.5">
                <div className="flex items-center justify-center gap-1.5 text-amber-800">
                  <ChefHat className="w-4 h-4" />
                  <h3 className="font-serif font-bold text-amber-950 text-base sm:text-lg tracking-wide leading-snug">
                    ספר המתכונים של שמוליק פייגנבוים
                  </h3>
                </div>
                <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-amber-600/40 to-transparent mx-auto" />
              </div>

              {/* VINTAGE FRAMED PHOTO (Randomly picked on each opening) */}
              <div className="my-auto flex flex-col items-center justify-center">
                <div
                  className="relative p-2 sm:p-2.5 bg-white/95 rounded-lg border border-amber-800/20 shadow-md transform -rotate-1 hover:rotate-0 transition-transform duration-500 max-w-[280px] sm:max-w-[320px]"
                  style={{
                    boxShadow: '0 8px 20px -4px rgba(120, 53, 15, 0.25), 0 2px 6px rgba(0,0,0,0.1)',
                  }}
                >
                  {/* Antique Photo Corners / Photo mounting tape */}
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-700/60" />
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-700/60" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-700/60" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-700/60" />

                  {/* Photo Container */}
                  <div className="relative w-[240px] sm:w-[280px] h-[160px] sm:h-[190px] rounded overflow-hidden bg-amber-900/10 border border-amber-200/50">
                    <img
                      src={selectedPhoto}
                      alt="תמונת זכרונות משפחתית"
                      className="w-full h-full object-cover"
                    />
                    {/* Subtle warm vintage film lighting overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-amber-950/20 via-transparent to-amber-100/10 pointer-events-none" />
                  </div>

                  {/* Handwritten Hebrew Caption */}
                  <div className="pt-2 text-center">
                    <p className="font-serif italic text-[11px] sm:text-xs text-amber-900/90 flex items-center justify-center gap-1 font-medium">
                      <span>רגעים של טעם, משפחה ואהבה</span>
                      <Heart className="w-3 h-3 text-red-700/70 fill-red-700/70 inline" />
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Quote & Subtitle */}
              <div className="text-center space-y-1">
                <p className="text-[11px] text-amber-900/80 italic font-serif leading-tight">
                  "אוצר הטעמים, הזכרונות והיצירות המשפחתיות"
                </p>
                <div className="text-[9px] text-amber-800/60 font-serif pt-1 border-t border-amber-800/10">
                  מופעל ומאורגן על ידי בינה מלאכותית • Gemini
                </div>
              </div>
            </div>
          </div>

          {/* PAGE FLIPPING EFFECT (Middle page that turns) */}
          <div
            className="absolute inset-2 sm:inset-3 rounded-l-xl origin-left"
            style={{
              transformStyle: 'preserve-3d',
              transform: stage === 'opened' || stage === 'zooming' ? 'rotateY(-175deg)' : 'rotateY(0deg)',
              transition: 'transform 2.6s cubic-bezier(0.4, 0, 0.2, 1)',
              backgroundImage: `linear-gradient(to left, #eeddbb, #fdfaf2 10%, #fdfaf2 90%, #eeddbb)`,
              boxShadow: 'inset -15px 0 25px rgba(120,53,15,0.2)',
            }}
          >
            {/* Front of flipping page */}
            <div
              className="absolute inset-0 p-6 flex flex-col justify-center items-center text-amber-900/40 text-center"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="w-16 h-0.5 bg-amber-400/30 mb-2" />
              <span className="text-xs font-serif italic">פותח דפים...</span>
            </div>
            {/* Back of flipping page */}
            <div
              className="absolute inset-0 p-6 flex flex-col justify-center items-center text-amber-900/70 text-center border-r border-[#caa469]/30"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                backgroundImage: `linear-gradient(to right, #eeddbb, #fdfaf2 10%, #fdfaf2 90%, #eeddbb)`,
              }}
            >
              <Sparkles className="w-6 h-6 text-amber-500/60 mb-2 animate-bounce" />
              <span className="text-xs font-serif font-bold text-amber-950">ברוכים הבאים למטבח</span>
            </div>
          </div>

          {/* FRONT COVER (The Heavy Antique Leather Hardcover that Flips Open) */}
          <div
            className="absolute inset-0 rounded-2xl origin-left"
            style={{
              transformStyle: 'preserve-3d',
              transform:
                stage === 'opening' || stage === 'opened' || stage === 'zooming'
                  ? 'rotateY(-180deg)'
                  : 'rotateY(0deg)',
              transition: 'transform 3.2s cubic-bezier(0.25, 1, 0.35, 1)',
              boxShadow:
                stage === 'closed'
                  ? '20px 20px 50px rgba(0,0,0,0.8), -5px 0 20px rgba(0,0,0,0.6)'
                  : 'none',
            }}
          >
            {/* OUTSIDE FRONT COVER (Facing user when closed) */}
            <div
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#3b1509] via-[#4d1d0c] to-[#290d04] border-[6px] border-[#92400e] p-6 flex flex-col justify-between items-center text-center overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                boxShadow:
                  'inset 0 0 60px rgba(0,0,0,0.8), inset 0 0 15px rgba(251,191,36,0.3), 0 15px 30px rgba(0,0,0,0.7)',
              }}
            >
              {/* Antique Leather Texture Overlay */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(#000 15%, transparent 16%), radial-gradient(#000 15%, transparent 16%)`,
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 4px 4px',
                }}
              />

              {/* Ornate Gold Foil Outer Border */}
              <div className="absolute inset-3 border-2 border-[#d97706]/70 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                {/* Filigree Corner Accents */}
                <div className="flex justify-between text-amber-400/90 text-lg leading-none">
                  <span>⚜</span>
                  <span>⚜</span>
                </div>
                <div className="flex justify-between text-amber-400/90 text-lg leading-none">
                  <span>⚜</span>
                  <span>⚜</span>
                </div>
              </div>

              {/* Inner Embossed Gold Border */}
              <div className="absolute inset-5 border border-[#fbbf24]/50 rounded-lg pointer-events-none" />

              {/* Book Spine Shadow Left */}
              <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-black/70 to-transparent pointer-events-none" />

              {/* Top Emblem */}
              <div className="mt-4 z-10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-400 via-amber-600 to-yellow-800 p-0.5 shadow-lg shadow-amber-500/30 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-[#351307] flex items-center justify-center border border-amber-300/40">
                    <ChefHat className="w-7 h-7 text-amber-300 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                  </div>
                </div>
              </div>

              {/* Embossed Gold Foil Hebrew Title */}
              <div className="z-10 space-y-2.5 my-auto px-2 max-w-full">
                <h1
                  className="text-2xl sm:text-3xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-[#fef08a] via-[#f59e0b] to-[#b45309] leading-snug"
                  style={{
                    filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.9)) drop-shadow(0 0 14px rgba(245,158,11,0.6))',
                    fontFamily: 'serif',
                  }}
                >
                  ספר המתכונים
                </h1>

                <div className="text-xl sm:text-2xl font-bold tracking-normal text-amber-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  של שמוליק פייגנבוים
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-amber-400" />
                  <span className="text-amber-300 text-xs">✦</span>
                  <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-amber-400" />
                </div>

                <p
                  className="text-xs font-semibold tracking-widest text-amber-200/80 uppercase font-serif"
                  style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}
                >
                  מתכוני המשפחה והשף
                </p>
              </div>

              {/* Golden Latch & Bottom Stamp */}
              <div className="z-10 mb-3 flex flex-col items-center gap-1.5">
                <div className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-[10px] font-mono text-amber-300/90 shadow-inner">
                  מהדורת AI פרמיום
                </div>
              </div>
            </div>

            {/* INSIDE FRONT COVER (Visible when book is open) */}
            <div
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#2c1006] via-[#3a1608] to-[#1f0a03] border-4 border-[#78350f] p-8 flex flex-col justify-between overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)',
              }}
            >
              {/* Marbled Endpaper texture */}
              <div className="border border-amber-600/30 rounded-xl h-full p-6 flex flex-col justify-between bg-[#240d05]/60 text-amber-200/70 font-serif text-center">
                <div className="text-amber-300 text-sm font-bold">✦ ספר המתכונים של שמוליק פייגנבוים ✦</div>
                <div className="space-y-2">
                  <p className="text-xs leading-relaxed italic">
                    "אין אהבה כנה יותר מאשר אהבת האוכל והבישול הביתי."
                  </p>
                  <div className="w-12 h-0.5 bg-amber-500/30 mx-auto" />
                </div>
                <div className="text-[10px] text-amber-400/50">פתח כדי לצפות בכל המתכונים</div>
              </div>
            </div>
          </div>

          {/* BOOK SPINE (Left 3D curve) */}
          <div
            className="absolute top-0 bottom-0 -left-6 w-8 rounded-l-md bg-gradient-to-r from-[#1b0a04] via-[#4d1d0c] to-[#2e1107] border-l-2 border-t-2 border-b-2 border-[#92400e]"
            style={{
              transform: 'rotateY(-90deg) translateZ(4px)',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.9)',
            }}
          />
        </div>
      </div>

      {/* Opening status text */}
      <div className="absolute bottom-8 text-center text-amber-300/70 text-xs font-serif tracking-widest pointer-events-none animate-pulse">
        {stage === 'closed' && 'מתכונן לפתיחת הספר...'}
        {stage === 'opening' && 'פותח את ספר המתכונים...'}
        {(stage === 'opened' || stage === 'zooming') && 'ברוך הבא! נכנס לאוסף המתכונים...'}
      </div>
    </div>
  );
};
