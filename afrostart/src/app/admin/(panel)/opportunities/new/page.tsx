import { AdminHeader } from "@/components/admin/ui";
import { OpportunityForm } from "../OpportunityForm";

export default function NewOpportunity() {
  return (<><AdminHeader title="New opportunity" sub="Only add opportunities you have confirmed on the official source." /><OpportunityForm /></>);
}
