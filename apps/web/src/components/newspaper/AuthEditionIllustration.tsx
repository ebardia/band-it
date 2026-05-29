import Image from 'next/image'

type Props = {
  src: string
  alt: string
  caption: string
}

/** Compact editorial photo — sits in the right rail of auth edition pages. */
export function AuthEditionIllustration({ src, alt, caption }: Props) {
  return (
    <figure className="np-auth-edition-figure">
      <div className="np-daily-classified-frame">
        <Image
          src={src}
          alt={alt}
          width={640}
          height={427}
          className="np-daily-classified-img"
          priority
        />
      </div>
      <figcaption className="np-daily-classified-caption">{caption}</figcaption>
    </figure>
  )
}
