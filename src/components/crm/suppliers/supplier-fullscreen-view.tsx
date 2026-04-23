"use client";


import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, MapPin, Globe, X, Phone, Mail, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ISupplierData } from "@/types/suppliers";
import SupplierItemsTable from "./supplier-items-table";
import SupplierLibraryItemsTable from "./supplier-library-items-table";
import { Badge } from "@/components/ui/badge";

interface SupplierFullscreenViewProps {
  isOpen: boolean;
  onClose: () => void;
  supplierData: ISupplierData | null;
  onEdit?: () => void;
}

export default function SupplierFullscreenView({ isOpen, onClose, supplierData, onEdit }: SupplierFullscreenViewProps) {
  if (!supplierData) return null;

  const contacts = supplierData.contacts || supplierData.team_members || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="md:max-w-[100vw] w-full h-full p-0 gap-0 flex flex-col bg-background"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{supplierData.name}</DialogTitle>

        {/* Header */}
        <DialogHeader className="border-b bg-background sticky top-0 z-10 px-6 py-3 shadow-sm shrink-0">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
            <h1 className="text-xl font-bold tracking-tight">{supplierData.name}</h1>
            <div className="flex items-center gap-4 shrink-0">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit} className="gap-2 h-8">
                  <Edit className="w-3 h-3" />
                  Edit
                </Button>
              )}
              <Button variant="destructive" size="icon" onClick={onClose} className="size-7">
                <span className="sr-only">Close</span>
                <X />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <ScrollArea className="flex-1 min-h-0 bg-muted/5">
          <div className="max-w-7xl mx-auto py-6 pb-20 px-6 space-y-6">
            {/* ── Basic Details (always visible) ── */}
            <div className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60">
              <div className="px-6 py-4 bg-background border-b">
                <h3 className="text-lg font-semibold">Basic Details</h3>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center flex-wrap justify-between *:space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">
                          {[supplierData.city_name, supplierData.country_name].filter(Boolean).join(", ") || "-"}
                        </p>
                        {supplierData.address && (
                          <p className="text-xs text-muted-foreground">{supplierData.address}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Website</p>
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      {supplierData.website ? (
                        <a
                          href={supplierData.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate"
                        >
                          {supplierData.website}
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Booking Mode</p>
                    <p className="text-sm font-medium capitalize">
                      {supplierData.booking_mode?.replace("_", " ") || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <div className="flex gap-2.5 flex-wrap">
                      {supplierData.category && supplierData.category.length > 0 ? (
                        supplierData.category.map((cat) => (
                          <Badge key={cat} variant={"outline"} className="py-1 px-3 capitalize">
                            {cat}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>

                  <div className="min-w-32">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block w-2 h-2 rounded-full animate-pulse ${supplierData.is_active ? "bg-primary" : "bg-muted-foreground"}`}
                      />
                      <p className="text-sm font-medium">{supplierData.is_active ? "Active" : "Inactive"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Contacts (always visible) ── */}
            <div className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60">
              <div className="px-6 py-4 bg-background border-b flex items-center gap-2">
                <h3 className="text-lg font-semibold">Contacts</h3>
                {contacts.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">({contacts.length})</span>
                )}
              </div>
              <div className="px-6 py-4">
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No contacts added.</p>
                ) : (
                  <div className="flex items-center gap-6 flex-wrap">
                    {contacts.map((contact, idx) => (
                      <div
                        key={contact.id || idx}
                        className="rounded-md border bg-background h-32 px-4 py-2.5 space-y-2"
                      >
                        <p className="capitalize">{contact.name}</p>

                        {contact.department && contact.department.length > 0 && (
                          <div className="flex gap-2">
                            {contact.department.map((dept) => (
                              <Badge variant={"outline"} key={dept} className="text-xs capitalize">
                                {dept}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="space-y-0.5">
                          {contact.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                              <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                              <p className="text-xs text-muted-foreground">{contact.phone}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Products ── */}
            <Accordion type="single" collapsible>
              <AccordionItem
                value="products"
                className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
              >
                <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg font-semibold">Products</span>
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <SupplierItemsTable supplierId={supplierData.id} teamMembers={contacts} readOnly />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* ── Library Items ── */}
            <Accordion type="single" collapsible>
              <AccordionItem
                value="library"
                className="rounded-lg overflow-hidden border-2 border-border/40 drop-shadow drop-shadow-muted/60"
              >
                <AccordionTrigger className="px-6 py-4 bg-background hover:no-underline hover:bg-muted/30 [&>svg]:hidden group">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg font-semibold">Library Items</span>
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <SupplierLibraryItemsTable supplierId={supplierData.id} readOnly />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
