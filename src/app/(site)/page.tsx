import { Hero } from "@/components/home/Hero";
import { NewDrop } from "@/components/home/NewDrop";
import { FeaturedCollection } from "@/components/home/FeaturedCollection";
import { Material } from "@/components/home/Material";
import { Manifesto } from "@/components/home/Manifesto";
import { InstagramGrid } from "@/components/home/InstagramGrid";
import { getNewDrop } from "@/lib/data/catalog";

/**
 * char → cream → image → cream → char → loam.
 * Three of the six sections have no large type at all.
 */
export default async function HomePage() {
  const newDrop = await getNewDrop(4);

  return (
    <>
      <Hero />
      <NewDrop products={newDrop} />
      <FeaturedCollection />
      <Material />
      <Manifesto />
      <InstagramGrid />
    </>
  );
}
