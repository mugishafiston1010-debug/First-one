import { AdminHeader } from "@/components/admin/ui";
import { GuideForm } from "../GuideForm";

export default function NewGuide() {
  return (
    <>
      <AdminHeader title="New guide" sub="Never publish information you have not checked. Link official sources wherever possible." />
      <GuideForm />
    </>
  );
}
