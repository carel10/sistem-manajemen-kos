/**
 * ThemedImage: illustrations that have a dark version (M1, S2, F1).
 * Photos (exterior/atrium) do NOT use this: they look the same in both themes, with no filter or overlay.
 */
import Image from "next/image";

type Props = {
  light: string;
  dark: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
};

export function ThemedImage({ light, dark, alt, width, height, className = "", sizes }: Props) {
  return (
    <>
      <Image src={light} alt={alt} width={width} height={height} sizes={sizes} className={`th-l ${className}`} />
      <Image src={dark} alt={alt} width={width} height={height} sizes={sizes} className={`th-d ${className}`} />
    </>
  );
}

export const ILUSTRASI = {
  m1: {
    light: "/images/ilustrasi/m1-meja-catatan.svg",
    dark: "/images/ilustrasi/m1-meja-catatan-gelap.svg",
    width: 800,
    height: 600,
    alt: "Ilustrasi meja berisi cetakan tabel, buku catatan sewa, kalkulator, catatan tempel, dan ponsel dengan percakapan chat",
  },
  s2: {
    light: "/images/ilustrasi/s2-beberapa-properti.svg",
    dark: "/images/ilustrasi/s2-beberapa-properti-gelap.svg",
    width: 640,
    height: 800,
    alt: "Ilustrasi tiga bangunan kos yang terhubung ke satu dashboard",
  },
  f1: {
    light: "/images/ilustrasi/f1-kamar-kos.svg",
    dark: "/images/ilustrasi/f1-kamar-kos-gelap.svg",
    width: 600,
    height: 800,
    alt: "Ilustrasi kamar kos rapi dengan kasur, meja belajar, jendela, dan rak dinding",
  },
} as const;

export const FOTO = {
  heroEksterior: {
    src: "/images/foto/landing-hero-eksterior-kos.jpg",
    width: 736,
    height: 589,
    objectPosition: "center 60%",
    alt: "Bangunan kos dua lantai dengan balkon berpagar, panel kayu, pot gantung, dan tanaman hijau di depan kamar",
  },
  segmenAtrium: {
    src: "/images/foto/landing-segmen-atrium-kos.jpg",
    width: 736,
    height: 920,
    objectPosition: "center",
    alt: "Area tengah kos bertingkat dengan koridor berpagar dan tanaman di setiap lantai",
  },
  masuk: { src: "/images/foto/auth-masuk-eksterior-kos.jpg", width: 736, height: 1308, objectPosition: "center 55%", alt: "" },
  daftar: { src: "/images/foto/auth-daftar-atrium-kos.jpg", width: 736, height: 981, objectPosition: "center 40%", alt: "" },
} as const;
