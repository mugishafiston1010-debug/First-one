import { AdminHeader } from "@/components/admin/ui";
import { BusinessForm } from "../BusinessForm";

export default function NewBusiness() {
  return (<><AdminHeader title="New listing" sub="Add only real businesses you have checked." /><BusinessForm /></>);
}
