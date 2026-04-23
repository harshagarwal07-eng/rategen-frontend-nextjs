"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";
import { Doc } from "@/types/docs";
import { format } from "date-fns";
import { IOption } from "@/types/common";
import { Autocomplete } from "../ui/autocomplete";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import AddDocSheet from "./actions/add-doc-sheet";
import EditDocSheet from "./actions/edit-doc-sheet";
import ViewDocSheet from "./actions/view-doc-sheet";
import DeleteDocSheet from "./actions/delete-doc-sheet";
import Show from "../ui/show";
import { SERVICE_TYPES } from "@/constants/data";

interface Props {
  docType: string;
  title: string;
  description: string;
  showNights: boolean;
  allowMultiplePerCountry: boolean;
  initialDocs: Doc[];
  countries: IOption[];
  initialCountry: string;
}

export default function DocsContentManager({
  docType,
  title,
  description,
  showNights,
  allowMultiplePerCountry,
  initialDocs: docs,
  countries,
  initialCountry,
}: Props) {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);

  const handleCountryChange = (country: string) => {
    const url = new URL(window.location.href);
    if (country) {
      url.searchParams.set("country", country);
    } else {
      url.searchParams.delete("country");
    }
    router.push(url.pathname + url.search);
  };

  return (
    <div className="flex flex-col h-full space-y-4 pb-10">
      {/* Single Header Row */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AddDocSheet
              allowMultiplePerCountry={allowMultiplePerCountry}
              docs={docs}
              title={title}
              docType={docType}
              showNights={showNights}
              countries={countries}
            />
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              size="lg"
            >
              <Filter className="w-5 h-5" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium min-w-fit">
                Filter by country:
              </p>
              <div className="flex-1 max-w-sm">
                <Autocomplete
                  options={[
                    { label: "All Countries", value: "" },
                    ...countries,
                  ]}
                  value={initialCountry}
                  onChange={handleCountryChange}
                  placeholder="Select country"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto flex gap-6 flex-wrap">
        {docs.map((doc) => (
          <Card key={doc.id} className="w-full sm:w-xl gap-2 h-full">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant={doc.is_active ? "default" : "destructive"}>
                      {doc.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant={"outline"}>{doc.country_name}</Badge>
                    <Show when={!!doc.service_type && docType === 'knowledgebase'}>
                      <Badge variant={"outline"} className="capitalize">
                        {SERVICE_TYPES.find(type => type.value === doc.service_type)?.label || doc.service_type}
                      </Badge>
                    </Show>
                    {showNights && doc.nights && (
                      <Badge variant="secondary" className="capitalize">
                        {doc.nights} nights
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Created: {format(new Date(doc.created_at), "PP")}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <ViewDocSheet
                    title={title}
                    showNights={showNights}
                    doc={doc}
                  />
                  <EditDocSheet
                    allowMultiplePerCountry={allowMultiplePerCountry}
                    docs={docs}
                    title={title}
                    showNights={showNights}
                    countries={countries}
                    doc={doc}
                  />
                  <DeleteDocSheet title={title} docId={Number(doc.id)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm line-clamp-3">
              <div dangerouslySetInnerHTML={{ __html: doc.content }} />
            </CardContent>
          </Card>
        ))}

        <Show when={docs.length === 0}>
          <div className="col-span-full text-center py-20 px-4 text-muted-foreground">
            No {title.toLowerCase()} found. Click &quot;Add {title}&quot; to
            create your first entry.
          </div>
        </Show>
      </div>
    </div>
  );
}
