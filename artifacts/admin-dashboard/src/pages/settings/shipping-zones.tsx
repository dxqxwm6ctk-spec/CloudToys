import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Truck, Plus, Pencil, Trash2, Loader2, X, Star } from 'lucide-react';
import { getApiBase } from '@/lib/api-url';
import { authHeader } from '@/lib/auth-token';

const BASE = getApiBase();

const JORDAN_GOVERNORATES = [
  { value: 'amman', label: 'عمّان' },
  { value: 'irbid', label: 'إربد' },
  { value: 'zarqa', label: 'الزرقاء' },
  { value: 'balqa', label: 'البلقاء' },
  { value: 'mafraq', label: 'المفرق' },
  { value: 'karak', label: 'الكرك' },
  { value: 'jerash', label: 'جرش' },
  { value: 'ajloun', label: 'عجلون' },
  { value: 'madaba', label: 'مادبا' },
  { value: 'tafilah', label: 'الطفيلة' },
  { value: 'maan', label: 'معان' },
  { value: 'aqaba', label: 'العقبة' },
];

interface ShippingZone {
  id: string;
  name: string;
  governorates: string[];
  price: number;
  isDefault: boolean;
}

interface ZoneFormState {
  name: string;
  governorates: string[];
  price: string;
  isDefault: boolean;
}

const emptyForm = (): ZoneFormState => ({
  name: '',
  governorates: [],
  price: '',
  isDefault: false,
});

async function fetchZones(): Promise<ShippingZone[]> {
  const res = await fetch(`${BASE}/api/admin/settings/shipping-zones`, {
    credentials: 'include',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

async function saveZone(data: ZoneFormState, id?: string): Promise<ShippingZone> {
  const url = id
    ? `${BASE}/api/admin/settings/shipping-zones/${id}`
    : `${BASE}/api/admin/settings/shipping-zones`;
  const res = await fetch(url, {
    method: id ? 'PUT' : 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({
      name: data.name,
      governorates: data.governorates,
      price: Number(data.price),
      isDefault: data.isDefault,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to save');
  }
  return res.json();
}

async function deleteZone(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/admin/settings/shipping-zones/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete');
}

// ── Governorate multi-select ───────────────────────────────────────────────

function GovernorateSelector({
  selected,
  onChange,
  usedByOtherZones,
}: {
  selected: string[];
  onChange: (vals: string[]) => void;
  usedByOtherZones: string[];
}) {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {JORDAN_GOVERNORATES.map((gov) => {
        const isSelected = selected.includes(gov.value);
        const isUsed = usedByOtherZones.includes(gov.value) && !isSelected;
        return (
          <button
            key={gov.value}
            type="button"
            onClick={() => !isUsed && toggle(gov.value)}
            disabled={isUsed}
            className={[
              'px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-right',
              isSelected
                ? 'bg-primary text-primary-foreground border-primary'
                : isUsed
                  ? 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50'
                  : 'bg-white border-border hover:border-primary/50 hover:bg-primary/5',
            ].join(' ')}
          >
            {gov.label}
            {isUsed && <span className="block text-[10px] opacity-70">مُعيّنة</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Zone Form ──────────────────────────────────────────────────────────────

function ZoneForm({
  initial,
  editingId,
  allZones,
  onCancel,
  onSaved,
}: {
  initial: ZoneFormState;
  editingId?: string;
  allZones: ShippingZone[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ZoneFormState>(initial);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Collect governorates already assigned to OTHER zones
  const usedByOthers = allZones
    .filter((z) => z.id !== editingId)
    .flatMap((z) => z.governorates);

  const mutation = useMutation({
    mutationFn: () => saveZone(form, editingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-zones'] });
      toast({ title: editingId ? 'Zone updated' : 'Zone created' });
      onSaved();
    },
    onError: (err) =>
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: 'Zone name is required', variant: 'destructive' });
      return;
    }
    const price = Number(form.price);
    if (isNaN(price) || price < 0) {
      toast({ title: 'Enter a valid price (0 or more)', variant: 'destructive' });
      return;
    }
    mutation.mutate();
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{editingId ? 'تعديل المنطقة' : 'منطقة توصيل جديدة'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="zone-name">اسم المنطقة</Label>
              <Input
                id="zone-name"
                placeholder="مثال: عمّان وضواحيها"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zone-price">سعر التوصيل (JOD)</Label>
              <Input
                id="zone-price"
                type="number"
                min={0}
                step={0.5}
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              المحافظات
              {form.governorates.length > 0 && (
                <span className="ml-2 text-muted-foreground font-normal">
                  ({form.governorates.length} محافظة مختارة)
                </span>
              )}
            </Label>
            <GovernorateSelector
              selected={form.governorates}
              onChange={(vals) => setForm((f) => ({ ...f, governorates: vals }))}
              usedByOtherZones={usedByOthers}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="zone-default"
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              className="w-4 h-4 rounded accent-primary"
            />
            <Label htmlFor="zone-default" className="cursor-pointer font-normal">
              منطقة افتراضية — تُطبَّق على أي محافظة غير مُعيّنة
            </Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? 'حفظ التعديلات' : 'إضافة المنطقة'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              إلغاء
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ShippingZonesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['admin', 'shipping-zones'],
    queryFn: fetchZones,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteZone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipping-zones'] });
      toast({ title: 'Zone deleted' });
    },
    onError: (err) =>
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      }),
  });

  const govLabel = (value: string) =>
    JORDAN_GOVERNORATES.find((g) => g.value === value)?.label ?? value;

  const formInitial = editingZone
    ? {
        name: editingZone.name,
        governorates: editingZone.governorates,
        price: String(editingZone.price),
        isDefault: editingZone.isDefault,
      }
    : emptyForm();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">مناطق التوصيل</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            حدّد أسعار التوصيل لكل محافظة. يمكنك تجميع عدة محافظات في منطقة واحدة بسعر موحّد.
          </p>
        </div>
        {!showForm && !editingZone && (
          <Button onClick={() => setShowForm(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            منطقة جديدة
          </Button>
        )}
      </div>

      {(showForm && !editingZone) && (
        <ZoneForm
          initial={emptyForm()}
          allZones={zones}
          onCancel={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
        />
      )}

      {editingZone && (
        <ZoneForm
          initial={formInitial}
          editingId={editingZone.id}
          allZones={zones}
          onCancel={() => setEditingZone(null)}
          onSaved={() => setEditingZone(null)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            المناطق المُعرَّفة
          </CardTitle>
          <CardDescription>
            عند تقديم الطلب، يتم تحديد سعر التوصيل بناءً على محافظة العميل.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد مناطق توصيل بعد</p>
              <p className="text-sm mt-1">أضف منطقة لتبدأ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-start gap-4 p-4 rounded-xl border border-border bg-secondary/20"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{zone.name}</span>
                      {zone.isDefault && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Star className="w-3 h-3" />
                          افتراضية
                        </Badge>
                      )}
                      <span className="text-primary font-bold text-sm mr-auto">
                        {zone.price.toFixed(3)} JOD
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {zone.governorates.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {zone.isDefault ? 'جميع المحافظات غير المُعيّنة' : 'لا توجد محافظات'}
                        </span>
                      ) : (
                        zone.governorates.map((g) => (
                          <span
                            key={g}
                            className="inline-flex items-center gap-1 bg-white border border-border rounded-full px-2.5 py-0.5 text-xs"
                          >
                            {govLabel(g)}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => { setShowForm(false); setEditingZone(zone); }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm(`حذف منطقة "${zone.name}"؟`)) {
                          deleteMutation.mutate(zone.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
