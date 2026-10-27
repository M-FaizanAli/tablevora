"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useStations,
  useUpdateMenuItem,
  useUpdateMenuPhoto,
  useUploadItemImage,
  type MenuCategory,
  type MenuItem,
} from "@/hooks/use-menu";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { StockTrackingSection } from "@/components/menu/stock-tracking-section";
import { useSettings } from "@/hooks/use-settings";
import { ApiError } from "@/lib/api";
import { prepareMenuImage } from "@/lib/prepare-menu-image";

// Mounted only while a specific item is being edited (see MenuPage), keyed
// by item.id — same pattern as EditRoleDialog/EditCategoryDialog.
export function EditItemDialog({
  branchId,
  item,
  categories,
  onClose,
}: {
  branchId: string | null;
  item: MenuItem;
  categories: MenuCategory[];
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [stationId, setStationId] = useState(item.stationId ?? "");
  const [price, setPrice] = useState(item.price);
  const [halfPrice, setHalfPrice] = useState(item.halfPrice ?? "");
  const [taxRatePercent, setTaxRatePercent] = useState(item.taxRatePercent);
  const [isVeg, setIsVeg] = useState(item.isVeg);
  const [imageUrl, setImageUrl] = useState<string | null>(item.imageUrl ?? null);
  const [imagePreview, setImagePreview] = useState<string | undefined>(item.imageUrl ?? undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  useEffect(() => () => { if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  const { data: stations } = useStations(branchId);
  const { data: settings } = useSettings(branchId);
  const { data: me } = useCurrentUser();
  const updateItem = useUpdateMenuItem(branchId);
  const updatePhoto = useUpdateMenuPhoto(branchId);
  const photoOnly = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const uploadImage = useUploadItemImage();
  const priceLabel =
    settings?.branch.taxMode === "EXCLUSIVE" ? "Price (excl. tax)" : "Price (incl. tax)";

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPreparingPhoto(true);
    try {
      const prepared = await prepareMenuImage(file);
      setImagePreview(URL.createObjectURL(prepared));
      const result = await uploadImage.mutateAsync(prepared);
      setImageUrl(result.url);
      setImagePreview(result.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload image');
      setImagePreview(imageUrl ?? undefined);
    } finally { setPreparingPhoto(false); }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (photoOnly) {
      updatePhoto.mutate({ id: item.id, imageUrl }, {
        onSuccess: () => { toast.success('Menu photo updated'); onClose(); },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not save photo'),
      });
      return;
    }
    if (!categoryId) {
      toast.error("Choose a category");
      return;
    }
    updateItem.mutate(
      {
        id: item.id,
        dto: {
          name,
          categoryId,
          stationId: stationId || undefined,
          price: Number(price),
          halfPrice: halfPrice.trim() === "" ? null : Number(halfPrice),
          taxRatePercent: Number(taxRatePercent),
          isVeg,
          imageUrl,
        },
      },
      {
        onSuccess: () => {
          toast.success(`"${name}" updated`);
          onClose();
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update item"),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{photoOnly ? "Update menu photo" : "Edit menu item"}</DialogTitle>
            {photoOnly && <p className="text-xs text-muted-foreground">Try adding, replacing, or removing a photo. Other menu settings are read-only in the shared demo.</p>}
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label>Photo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={onFileChange}
            />
            {imagePreview ? (
              <div className="relative h-28 w-28 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob/uploaded preview, not a Next-optimizable remote asset */}
                <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  disabled={preparingPhoto}
                  onClick={() => {
                    setImageUrl(null);
                    setImagePreview(undefined);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {(uploadImage.isPending || preparingPhoto) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-xs">
                    Preparing photo…
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-28 w-28 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-xs">Add photo</span>
              </button>
            )}
            {imagePreview && <Button type="button" variant="outline" size="sm" className="mt-2 self-start" disabled={preparingPhoto} onClick={() => fileInputRef.current?.click()}>Change photo</Button>}
            <p className="text-xs text-muted-foreground">Photos are resized automatically and saved with your menu.</p>
          </div>

          <fieldset disabled={photoOnly} className="contents">
          <div className="flex flex-col gap-2">
            <Label htmlFor="item-edit-name">Name</Label>
            <Input
              id="item-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Margherita Pizza"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-price">{priceLabel}</Label>
              <Input
                id="edit-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-tax">Tax rate %</Label>
              <Input
                id="edit-tax"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-half">Half portion price (optional)</Label>
            <Input
              id="edit-half"
              type="number"
              min="0"
              step="0.01"
              value={halfPrice}
              onChange={(e) => setHalfPrice(e.target.value)}
              placeholder="Leave empty if there is no half/full choice"
            />
            <p className="text-xs text-muted-foreground">
              When set, the POS asks Half / Full / Custom. The price above is the Full portion.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Kitchen station</Label>
            <Select value={stationId} onValueChange={(v) => setStationId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {stations?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <Label htmlFor="edit-is-veg" className="cursor-pointer">
              Vegetarian
            </Label>
            <Switch id="edit-is-veg" checked={isVeg} onCheckedChange={setIsVeg} disabled={photoOnly} />
          </div>

          </fieldset>
          <DialogFooter>
            <Button type="submit" disabled={updateItem.isPending || updatePhoto.isPending || uploadImage.isPending || preparingPhoto}>
              {updateItem.isPending || updatePhoto.isPending ? "Saving…" : photoOnly ? "Save photo" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
        {!photoOnly && hasPermission(me?.user, "inventory.manage") && (
          <StockTrackingSection branchId={branchId} itemId={item.id} isCombo={item.isCombo} />
        )}
      </DialogContent>
    </Dialog>
  );
}
