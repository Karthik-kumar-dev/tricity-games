'use client';

import React from 'react';

interface CuteMatchAnimationProps {
  status: 'waiting' | 'matched';
  userName?: string;
  partnerName?: string;
}

export function CuteMatchAnimation({
  status,
  userName = 'You',
  partnerName = 'Teammate',
}: CuteMatchAnimationProps) {
  if (status === 'waiting') {
    return (
      <div className="cute-animation-container">
        {/* Soft background glow */}
        <div className="cute-ambient-glow" />

        {/* Searching Wave Rings */}
        <div className="cute-signal-ring cute-signal-1" />
        <div className="cute-signal-ring cute-signal-2" />
        <div className="cute-signal-ring cute-signal-3" />

        <div className="cute-buddies-row">
          {/* Bot 1: Bouncing Cyan Hacker Bot (You) */}
          <div className="cute-bot cute-bot-blue cute-bounce-1">
            {/* Antenna with star */}
            <div className="cute-antenna">
              <div className="cute-antenna-stem" />
              <div className="cute-antenna-star">⭐</div>
            </div>
            {/* Bot Head/Body */}
            <div className="cute-bot-head cute-head-blue">
              {/* Screen Face */}
              <div className="cute-bot-face">
                <span className="cute-eye">◕</span>
                <span className="cute-mouth">ᴗ</span>
                <span className="cute-eye">◕</span>
              </div>
              {/* Rosy Cheeks */}
              <div className="cute-cheeks">
                <span className="cute-blush" />
                <span className="cute-blush" />
              </div>
            </div>
            {/* Waving Hand */}
            <div className="cute-hand cute-hand-wave">👋</div>

            {/* User Animated Name Tag */}
            <div className="bot-animated-nametag user-nametag" title={userName}>
              <span className="nametag-role-dot" />
              <span className="nametag-text">{userName}</span>
            </div>
          </div>

          {/* Connection Signal Sparks */}
          <div className="cute-bridge">
            <div className="cute-spark cute-spark-1">✨</div>
            <div className="cute-beam">
              <span className="cute-dot cute-dot-1" />
              <span className="cute-dot cute-dot-2" />
              <span className="cute-dot cute-dot-3" />
            </div>
            <div className="cute-spark cute-spark-2">🚀</div>
          </div>

          {/* Bot 2: Floating Purple Companion Bot (Searching Partner) */}
          <div className="cute-bot cute-bot-purple cute-bounce-2">
            {/* Visor Headphones */}
            <div className="cute-headphones">
              <span className="cute-headphone-left" />
              <span className="cute-headphone-band" />
              <span className="cute-headphone-right" />
            </div>
            {/* Bot Head/Body */}
            <div className="cute-bot-head cute-head-purple">
              <div className="cute-bot-face">
                <span className="cute-eye">ᵔ</span>
                <span className="cute-mouth">▾</span>
                <span className="cute-eye">ᵔ</span>
              </div>
              <div className="cute-cheeks">
                <span className="cute-blush cute-blush-purple" />
                <span className="cute-blush cute-blush-purple" />
              </div>
            </div>
            {/* Waving Hand */}
            <div className="cute-hand cute-hand-tilt">✨</div>

            {/* Searching Partner Name Tag */}
            <div className="bot-animated-nametag searching-nametag">
              <span className="nametag-pulse-dot" />
              <span className="nametag-text">Finding Partner...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Matched State: High Five Celebration with Animated Names!
  return (
    <div className="cute-animation-container cute-matched-container">
      {/* Celebration Starbursts */}
      <div className="cute-burst-star star-tl">⭐</div>
      <div className="cute-burst-star star-tr">✨</div>
      <div className="cute-burst-star star-bl">🎉</div>
      <div className="cute-burst-star star-br">⭐</div>

      <div className="cute-celebration-bubble">
        <div className="cute-buddies-row cute-matched-duo">
          {/* Bot 1: Cyan Bot (You) */}
          <div className="cute-bot cute-bot-blue cute-celebrate-left">
            <div className="cute-antenna">
              <div className="cute-antenna-stem" />
              <div className="cute-antenna-star">⭐</div>
            </div>
            <div className="cute-bot-head cute-head-blue">
              <div className="cute-bot-face">
                <span className="cute-eye">^</span>
                <span className="cute-mouth">ᗜ</span>
                <span className="cute-eye">^</span>
              </div>
              <div className="cute-cheeks">
                <span className="cute-blush" />
                <span className="cute-blush" />
              </div>
            </div>

            {/* User Name Badge */}
            <div className="bot-matched-nametag user-matched-tag" title={userName}>
              <span className="matched-tag-badge">YOU 🤖</span>
              <span className="matched-tag-title">{userName}</span>
            </div>
          </div>

          {/* High Five Flash Effect */}
          <div className="cute-high-five-center">
            <div className="cute-highfive-hands">🙌</div>
            <div className="cute-clash-sparks">💥</div>
          </div>

          {/* Bot 2: Purple Bot (Teammate) */}
          <div className="cute-bot cute-bot-purple cute-celebrate-right">
            <div className="cute-headphones">
              <span className="cute-headphone-left" />
              <span className="cute-headphone-band" />
              <span className="cute-headphone-right" />
            </div>
            <div className="cute-bot-head cute-head-purple">
              <div className="cute-bot-face">
                <span className="cute-eye">^</span>
                <span className="cute-mouth">ᗜ</span>
                <span className="cute-eye">^</span>
              </div>
              <div className="cute-cheeks">
                <span className="cute-blush cute-blush-purple" />
                <span className="cute-blush cute-blush-purple" />
              </div>
            </div>

            {/* Partner Name Badge */}
            <div className="bot-matched-nametag partner-matched-tag" title={partnerName}>
              <span className="matched-tag-badge">TEAMMATE 🤖</span>
              <span className="matched-tag-title">{partnerName}</span>
            </div>
          </div>
        </div>

        {/* Animated Duo Partnership Strip linking both names */}
        <div className="cute-duo-names-strip animate-duo-pop">
          <div className="duo-name-chip chip-user">
            <span className="chip-avatar">🤖</span>
            <span className="chip-text">{userName}</span>
          </div>

          <div className="duo-bridge-symbol">
            <span className="duo-lightning">⚡</span>
            <span className="duo-label">TEAM</span>
          </div>

          <div className="duo-name-chip chip-partner">
            <span className="chip-avatar">🤖</span>
            <span className="chip-text">{partnerName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
