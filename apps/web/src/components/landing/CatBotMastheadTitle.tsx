'use client'

/** “Adopt A Cat” slanted like a hat over neon “BOT”. */
export function CatBotMastheadTitle() {
  return (
    <div className="np-catbot-masthead-brand" aria-label="Adopt A Cat Bot">
      <p className="np-catbot-masthead-hat" aria-hidden>
        Adopt A Cat
      </p>
      <p className="np-catbot-masthead-bot" aria-hidden>
        BOT
      </p>
    </div>
  )
}
