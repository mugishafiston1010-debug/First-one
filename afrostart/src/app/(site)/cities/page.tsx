import type { Metadata } from "next";
import { listCities } from "@/lib/queries";
import { CityCard } from "@/components/Cards";
import { EmptyState, PageHeader } from "@/components/Section";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Russian city guides for African students",
  description: "Universities, transport, accommodation resources and student services in Moscow, Saint Petersburg, Kazan, Tomsk and more.",
  alternates: { canonical: "/cities" },
};

export default async function CitiesPage() {
  const cities = await listCities();
  return (
    <>
      <PageHeader eyebrow="City guides" title="Find your city" sub="Each city page brings together universities, transport, local resources and reviewed student services." />
      <div className="container-x py-10">
        {cities.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((c, i) => <CityCard key={c.id} city={c} index={i} unis={c._count.universities} services={c._count.businesses} />)}
          </div>
        ) : (
          <EmptyState title="City guides are on their way" />
        )}
      </div>
    </>
  );
}
