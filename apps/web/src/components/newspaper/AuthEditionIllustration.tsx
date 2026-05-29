import Image from 'next/image'

type Props = {
  src: string
  alt: string
  caption: string
  size?: 'default' | 'large'
}

/** Compact editorial photo — sits in the right rail of auth edition pages. */
export function AuthEditionIllustration({ src, alt, caption, size = 'default' }: Props) {
  const figureClass =
    size === 'large'
      ? 'np-auth-edition-figure np-auth-edition-figure--large'
      : 'np-auth-edition-figure'

  const dimensions = size === 'large' ? { width: 720, height: 480 } : { width: 640, height: 427 }

  return (
    <figure className={figureClass}>
      <div className="np-daily-classified-frame">
        <Image
          src={src}
          alt={alt}
          width={dimensions.width}
          height={dimensions.height}
          className="np-daily-classified-img"
          priority
        />
      </div>
      <figcaption className="np-daily-classified-caption">{caption}</figcaption>
    </figure>
  )
}
