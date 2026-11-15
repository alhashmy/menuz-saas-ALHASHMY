import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Popup,
} from 'react-leaflet'
import L from 'leaflet'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Button,
} from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Input,
} from '@/components/ui/input'
import {
  Label,
} from '@/components/ui/label'
import {
  Switch,
} from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Badge,
} from '@/components/ui/badge'
import {
  Trash2,
  Save,
  Users,
  Layers,
  RefreshCw,
} from 'lucide-react'

// Ensure leaflet markers render correctly
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = defaultIcon

type Zone = {
  id: string
  district_name: string
  zone_name: string
  boundary: string | null
  delivery_fee: number
  min_order_amount: number
  is_active: boolean
  created_at: string
}

type Rider = {
  id: string
  full_name: string
  phone: string
  vehicle_type: string
  is_online: boolean
  is_available: boolean
  current_location: string | null
  last_location_at: string | null
  cod_balance: number
  is_verified: boolean
  created_at: string
}

type ZoneForm = {
  district_name: string
  zone_name: string
  delivery_fee: string
  min_order_amount: string
}

export function DeliveryManagementPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)
  const [mapCenter, setMapCenter] = useState<[number, number]>([33.3152, 44.3661])
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([])
  const [zoneForm, setZoneForm] = useState<ZoneForm>({
    district_name: '',
    zone_name: '',
    delivery_fee: '2000',
    min_order_amount: '0',
  })
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [deleteZoneId, setDeleteZoneId] = useState<string | null>(null)
  const [settlingRiderId, setSettlingRiderId] = useState<string | null>(null)
  const [settlementAmount, setSettlementAmount] = useState('')

  const mapRef = useRef<L.Map | null>(null)
  const drawnPolygonRef = useRef<L.Polygon | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [zonesRes, ridersRes] = await Promise.all([
        supabase.from<Zone>('platform_delivery_zones').select('*').order('created_at', { ascending: false }),
        supabase.from<Rider>('riders').select('*').order('created_at', { ascending: false }),
      ])
      if (zonesRes.error) throw zonesRes.error
      if (ridersRes.error) throw ridersRes.error
      setZones(zonesRes.data ?? [])
      setRiders(ridersRes.data ?? [])
    } catch {
      toast.error('فشل في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapRef.current || polygonPoints.length === 0) return

    if (drawnPolygonRef.current) {
      mapRef.current.removeLayer(drawnPolygonRef.current)
    }

    const latLngs = polygonPoints.map(([lat, lng]) => [lat, lng])
    const polygon = L.polygon(latLngs, { color: '#3b82f6', fillOpacity: 0.2 })
    polygon.addTo(mapRef.current)
    drawnPolygonRef.current = polygon

    mapRef.current.fitBounds(polygon.getBounds())
  }, [polygonPoints])

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng
    setPolygonPoints((prev) => [...prev, [lat, lng]])
    setMapCenter([lat, lng])
  }

  const clearPolygon = () => {
    setPolygonPoints([])
    if (drawnPolygonRef.current && mapRef.current) {
      mapRef.current.removeLayer(drawnPolygonRef.current)
      drawnPolygonRef.current = null
    }
  }

  const pointsToWKT = (points: [number, number][]): string => {
    if (points.length < 3) return ''
    const coords = points.map(([lat, lng]) => `${lng} ${lat}`).join(', ')
    const first = points[0]
    const closed = [...coords, `${first[1]} ${first[0]}`]
    return `SRID=4326;POLYGON((${closed.join(', ')}))`
  }

  const handleSaveZone = async () => {
    if (!zoneForm.district_name.trim() || !zoneForm.zone_name.trim()) {
      toast.error('الرجاء إدخال اسم القضاء والحي')
      return
    }
    if (polygonPoints.length < 3) {
      toast.error('الرجاء رسم المضلع على الخريطة (نقطتان على الأقل)')
      return
    }

    const wkt = pointsToWKT(polygonPoints)
    if (!wkt) {
      toast.error('المضلع غير صالح')
      return
    }

    try {
      if (editingZoneId) {
        const { error } = await supabase
          .from('platform_delivery_zones')
          .update({
            district_name: zoneForm.district_name,
            zone_name: zoneForm.zone_name,
            boundary: wkt,
            delivery_fee: parseFloat(zoneForm.delivery_fee) || 0,
            min_order_amount: parseFloat(zoneForm.min_order_amount) || 0,
          })
          .eq('id', editingZoneId)
        if (error) throw error
        toast.success('تم تحديث المنطقة بنجاح')
      } else {
        const { error } = await supabase
          .from('platform_delivery_zones')
          .insert({
            district_name: zoneForm.district_name,
            zone_name: zoneForm.zone_name,
            boundary: wkt,
            delivery_fee: parseFloat(zoneForm.delivery_fee) || 0,
            min_order_amount: parseFloat(zoneForm.min_order_amount) || 0,
          })
        if (error) throw error
        toast.success('تمت إضافة المنطقة بنجاح')
      }

      setPolygonPoints([])
      clearPolygon()
      setZoneForm({
        district_name: '',
        zone_name: '',
        delivery_fee: '2000',
        min_order_amount: '0',
      })
      setEditingZoneId(null)
      await fetchData()
    } catch {
      toast.error('فشل في حفظ المنطقة')
    }
  }

  const handleEditZone = (zone: Zone) => {
    setEditingZoneId(zone.id)
    setZoneForm({
      district_name: zone.district_name,
      zone_name: zone.zone_name,
      delivery_fee: String(zone.delivery_fee),
      min_order_amount: String(zone.min_order_amount),
    })
    if (zone.boundary && typeof zone.boundary === 'string') {
      const cleaned = zone.boundary.replace(/^SRID=4326;/i, '')
      const match = cleaned.match(/POLYGON\(\((.+)\)\)/)
      if (match) {
        const points = match[1].split(',').map(p => p.trim().split(' ').map(Number))
        setPolygonPoints(points.map(([lng, lat]) => [lat, lng] as [number, number]))
      }
    }
  }

  const handleToggleZone = async (zone: Zone) => {
    try {
      const { error } = await supabase
        .from('platform_delivery_zones')
        .update({ is_active: !zone.is_active })
        .eq('id', zone.id)
      if (error) throw error
      toast.success(`تم ${zone.is_active ? 'تعطيل' : 'تفعيل'} المنطقة`)
      await fetchData()
    } catch {
      toast.error('فشل في تحديث حالة المنطقة')
    }
  }

  const handleDeleteZone = async () => {
    if (!deleteZoneId) return
    try {
      const { error } = await supabase
        .from('platform_delivery_zones')
        .delete()
        .eq('id', deleteZoneId)
      if (error) throw error
      toast.success('تم حذف المنطقة')
      setDeleteZoneId(null)
      await fetchData()
    } catch {
      toast.error('فشل في حذف المنطقة')
    }
  }

  const handleVerifyRider = async (rider: Rider) => {
    try {
      const { error } = await supabase
        .from('riders')
        .update({ is_verified: !rider.is_verified })
        .eq('id', rider.id)
      if (error) throw error
      toast.success(`تم ${rider.is_verified ? 'إلغاء توثيق' : 'توثيق'} الكابتن`)
      await fetchData()
    } catch {
      toast.error('فشل في تحديث حالة التوثيق')
    }
  }

  const handleSettleCOD = async (rider: Rider) => {
    if (!settlementAmount.trim() || parseFloat(settlementAmount) <= 0) {
      toast.error('الرجاء إدخال مبلغ التسوية الصحيح')
      return
    }

    const amount = parseFloat(settlementAmount)
    if (amount > rider.cod_balance) {
      toast.error('المبلغ يتجاوز رصيد العهدة الحالي')
      return
    }

    try {
      const { error } = await supabase
        .from('rider_cod_ledger')
        .insert({
          rider_id: rider.id,
          transaction_type: 'cash_settlement',
          amount: -amount,
          notes: `تسوية عهدة نقدية للكابتن ${rider.full_name}`,
        })
      if (error) throw error

      const { error: updateError } = await supabase
        .from('riders')
        .update({ cod_balance: rider.cod_balance - amount })
        .eq('id', rider.id)
      if (updateError) throw updateError

      toast.success('تمت تسوية العهدة بنجاح')
      setSettlingRiderId(null)
      setSettlementAmount('')
      await fetchData()
    } catch {
      toast.error('فشل في إجراء التسوية')
    }
  }

  const handleConfirmDelete = () => {
    handleDeleteZone()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة التوصيل والمناطق</h1>
          <p className="text-muted-foreground">
            إدارة مناطق التوصيل الجغرافية والكباتن ورصيد العهدة
          </p>
        </div>
        <Button onClick={fetchData}>
          <RefreshCw className="ml-2 h-4 w-4" />
          تحديث
        </Button>
      </div>

      <Tabs defaultValue="zones" className="w-full">
        <TabsList>
          <TabsTrigger value="zones" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            المناطق الجغرافية
          </TabsTrigger>
          <TabsTrigger value="riders" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            الكباتن والعهدة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-xl border bg-card p-4 shadow">
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  style={{ height: '450px', width: '100%', borderRadius: '0.5rem' }}
                  onClick={handleMapClick}
                  onMapCreated={(map) => {
                    mapRef.current = map
                  }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {polygonPoints.length > 0 && (
                    <Polygon
                      positions={polygonPoints.map(([lat, lng]) => [lat, lng])}
                      color="#3b82f6"
                      fillOpacity={0.2}
                      weight={2}
                    />
                  )}
                  {polygonPoints.map((point, i) => (
                    <Marker key={i} position={point}>
                      <Popup>{`نقطة ${i + 1}`}</Popup>
                    </Marker>
                  ))}
                </MapContainer>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={clearPolygon} disabled={polygonPoints.length === 0}>
                    مسح النقاط
                  </Button>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {polygonPoints.length} نقطة تم تحديدها
                  </span>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveZone() }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم القضاء / الناحية</Label>
                    <Input
                      value={zoneForm.district_name}
                      onChange={(e) => setZoneForm({ ...zoneForm, district_name: e.target.value })}
                      placeholder="مثل: carcada"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>اسم الحي / المنطقة</Label>
                    <Input
                      value={zoneForm.zone_name}
                      onChange={(e) => setZoneForm({ ...zoneForm, zone_name: e.target.value })}
                      placeholder="مثل: الحي التجاري"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>أجرة التوصيل (دينار)</Label>
                    <Input
                      type="number"
                      value={zoneForm.delivery_fee}
                      onChange={(e) => setZoneForm({ ...zoneForm, delivery_fee: e.target.value })}
                      placeholder="2000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الحد الأدنى للطلب (دينار)</Label>
                    <Input
                      type="number"
                      value={zoneForm.min_order_amount}
                      onChange={(e) => setZoneForm({ ...zoneForm, min_order_amount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={polygonPoints.length < 3}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {editingZoneId ? 'تحديث المنطقة' : 'إغلاق المضلع وحفظ المنطقة'}
                </Button>
                {editingZoneId && (
                  <Button variant="outline" type="button" onClick={() => {
                    setEditingZoneId(null)
                    setZoneForm({ district_name: '', zone_name: '', delivery_fee: '2000', min_order_amount: '0' })
                    setPolygonPoints([])
                    clearPolygon()
                  }} className="w-full">
                    إلغاء التعديل
                  </Button>
                )}
              </form>
            </div>

            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-xl border bg-card p-4 shadow">
                <h3 className="text-lg font-semibold mb-4">المناطق المضافة</h3>
                {loading ? (
                  <div className="h-64 flex items-center justify-center">جاري التحميل...</div>
                ) : zones.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">لا توجد مناطق مضافة</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الحي</TableHead>
                        <TableHead>القضاء</TableHead>
                        <TableHead>السعر</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zones.map((zone) => (
                        <TableRow key={zone.id}>
                          <TableCell className="font-medium">{zone.zone_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{zone.district_name}</TableCell>
                          <TableCell className="font-mono text-sm">{zone.delivery_fee} د.ع</TableCell>
                          <TableCell>
                            <Switch
                              checked={zone.is_active}
                              onCheckedChange={() => handleToggleZone(zone)}
                              aria-label="تفعيل المنطقة"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditZone(zone)}
                                className="p-1.5"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteZoneId(zone.id)}
                                className="p-1.5"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="riders" className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow">
            <h3 className="text-lg font-semibold mb-4">إدارة الكباتن والعهدة النقدية</h3>
            {loading ? (
              <div className="h-64 flex items-center justify-center">جاري التحميل...</div>
            ) : riders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">لا يوجد كباتن مسجلين</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>نوع المركبة</TableHead>
                    <TableHead>حالة الاتصال</TableHead>
                    <TableHead>التوثيق</TableHead>
                    <TableHead>رصيد العهدة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riders.map((rider) => (
                    <TableRow key={rider.id}>
                      <TableCell className="font-medium">{rider.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rider.phone}</TableCell>
                      <TableCell className="text-sm capitalize">{rider.vehicle_type}</TableCell>
                      <TableCell>
                        <Badge
                          variant={rider.is_online ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {rider.is_online ? 'متصل' : 'غير متصل'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={rider.is_verified ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {rider.is_verified ? 'موثق' : 'غير موثق'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {rider.cod_balance} د.ع
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerifyRider(rider)}
                            className="px-2"
                          >
                            {rider.is_verified ? 'إلغاء توثيق' : 'توثيق'}
                          </Button>
                          {rider.cod_balance > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSettlingRiderId(rider.id)
                                setSettlementAmount(String(rider.cod_balance))
                              }}
                              className="px-2"
                            >
                              تصفية عهدة
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <Dialog open={settlingRiderId !== null} onOpenChange={(open) => { if (!open) { setSettlingRiderId(null); setSettlementAmount('') } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>تصفية عهدة نقدية</DialogTitle>
                <DialogDescription>
                  الكابتن المختار: {riders.find(r => r.id === settlingRiderId)?.full_name || ''}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); const rider = riders.find(r => r.id === settlingRiderId); if (rider) handleSettleCOD(rider) }}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>المبلغ المراد تصفيته (دينار)</Label>
                    <Input
                      type="number"
                      value={settlementAmount}
                      onChange={(e) => setSettlementAmount(e.target.value)}
                      placeholder="أدخل المبلغ"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setSettlingRiderId(null); setSettlementAmount('') }}>
                    إلغاء
                  </Button>
                  <Button type="submit">تأكيد التسوية</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={deleteZoneId !== null} onOpenChange={(open) => { if (!open) setDeleteZoneId(null) }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>تأكيد حذف المنطقة</DialogTitle>
                <DialogDescription>
                  هل أنت متأكد من حذف هذه المنطقة؟ لا يمكن التراجع عن هذا الإجراء.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteZoneId(null)}>
                  إلغاء
                </Button>
                <Button variant="destructive" onClick={handleConfirmDelete}>
                  حذف
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  )
}
