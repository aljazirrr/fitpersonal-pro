'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type Profile = {
  id: string
  full_name: string
  age: number | null
  height_cm: number | null
  current_weight_kg: number | null
  goal_weight_kg: number | null
  goal_type: string | null
}

type DailyTarget = {
  id: string
  profile_id: string
  calories_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  water_ml: number | null
}

type Food = {
  id: string
  name: string
  brand: string | null
  serving_size_g: number | null
  calories_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

type MealHistoryItem = {
  meal_id: string
  meal_type: string
  meal_date: string
  food_name: string
  quantity_g: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

type HydrationLog = {
  id: string
  profile_id: string
  log_date: string
  amount_ml: number
}

type ExerciseLibrary = {
  id: string
  name: string
  category: string | null
  muscle_group: string | null
  equipment: string | null
}

type Workout = {
  id: string
  profile_id: string
  workout_date: string
  workout_type: string
  title: string
  duration_min: number | null
  notes: string | null
  created_at?: string
}

type WorkoutExercise = {
  id: string
  workout_id: string
  exercise_name: string
  exercise_library_id: string | null
  sets: number | null
  reps: number | null
  weight_kg: number | null
  duration_min: number | null
  notes: string | null
  created_at?: string
}

type BodyMetric = {
  id: string
  profile_id: string
  metric_date: string
  weight_kg: number | null
  chest_cm: number | null
  waist_cm: number | null
  hips_cm: number | null
  arm_cm: number | null
  thigh_cm: number | null
  body_fat_percent: number | null
  muscle_mass_kg: number | null
  notes: string | null
  created_at?: string
}

type TabKey = 'dashboard' | 'nutrition' | 'hydration' | 'workout' | 'metrics' | 'library'

// ─────────────────────────────────────────────
// DESIGN SYSTEM COMPONENTS
// ─────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/[0.03] border border-white/[0.08] rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">
      {children}
    </p>
  )
}

function Badge({ children, variant = 'cyan' }: { children: React.ReactNode; variant?: string }) {
  const styles: Record<string, string> = {
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
    violet: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    green: 'bg-green-500/15 text-green-400 border-green-500/20',
    orange: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    pink: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/15 text-red-400 border-red-500/20',
  }
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${styles[variant] ?? styles.cyan}`}>
      {children}
    </span>
  )
}

function Btn({
  children,
  onClick,
  disabled,
  loading,
  variant = 'primary',
  size = 'md',
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md'
  className?: string
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm' }
  const variants: Record<string, string> = {
    primary: 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white hover:from-cyan-400 hover:to-indigo-400 shadow-lg shadow-cyan-500/15',
    ghost: 'text-white/50 hover:text-white hover:bg-white/[0.06]',
    outline: 'border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10',
  }
  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {loading && <Spinner />}
      {children}
    </button>
  )
}

const inputCls = 'w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.07] transition-colors'
const selectCls = `${inputCls} appearance-none cursor-pointer`

// ─────────────────────────────────────────────
// DATA VIZ COMPONENTS
// ─────────────────────────────────────────────

function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const r = 68
  const circ = 2 * Math.PI * r
  const pct = Math.min(consumed / (target || 1), 1)
  const offset = circ * (1 - pct)
  const over = consumed > (target || 1)
  const remaining = Math.max(0, target - consumed)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <defs>
          <linearGradient id="calRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={over ? '#f43f5e' : '#06b6d4'} />
            <stop offset="100%" stopColor={over ? '#ef4444' : '#818cf8'} />
          </linearGradient>
        </defs>
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
        <circle
          cx="90" cy="90" r={r}
          fill="none"
          stroke="url(#calRingGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute text-center select-none pointer-events-none">
        <div className="text-3xl font-bold leading-none">{Math.round(consumed)}</div>
        <div className="text-[10px] text-white/30 mt-1 uppercase tracking-wider">kcal</div>
        <div className={`text-xs mt-1.5 font-medium ${over ? 'text-rose-400' : 'text-white/40'}`}>
          {over ? `+${Math.round(consumed - target)} over` : `${Math.round(remaining)} left`}
        </div>
      </div>
    </div>
  )
}

function MacroBar({ label, value, target, from, to }: { label: string; value: number; target: number; from: string; to: string }) {
  const pct = Math.min((value / (target || 1)) * 100, 100)
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-white/45">{label}</span>
        <span className="text-xs font-medium text-white/60">
          {Math.round(value)}<span className="text-white/25">/{target}g</span>
        </span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(to right, ${from}, ${to})`,
            transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </div>
    </div>
  )
}

function WaterRing({ consumed, target }: { consumed: number; target: number }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const pct = Math.min(consumed / (target || 1), 1)
  const offset = circ * (1 - pct)
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="136" height="136" viewBox="0 0 136 136">
        <defs>
          <linearGradient id="waterRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <circle cx="68" cy="68" r={r} fill="none" stroke="rgba(6,182,212,0.08)" strokeWidth="10" />
        <circle
          cx="68" cy="68" r={r}
          fill="none"
          stroke="url(#waterRingGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 68 68)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute text-center select-none pointer-events-none">
        <div className="text-xl font-bold text-cyan-400">{(consumed / 1000).toFixed(1)}</div>
        <div className="text-[10px] text-white/35">/ {((target) / 1000).toFixed(1)} L</div>
      </div>
    </div>
  )
}

function StatMini({ label, value, unit, accent }: { label: string; value: string | number; unit?: string; accent: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 hover:bg-white/[0.05] transition-colors">
      <p className="text-2xl font-bold leading-none" style={{ color: accent }}>
        {value}
        {unit && <span className="text-sm font-normal text-white/30 ml-1">{unit}</span>}
      </p>
      <p className="text-xs text-white/35 mt-1.5">{label}</p>
    </div>
  )
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-3 text-xs shadow-2xl">
      <p className="text-white/40 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// TAB CONFIG
// ─────────────────────────────────────────────

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { key: 'nutrition', label: 'Nutrition', icon: '🥗' },
  { key: 'hydration', label: 'Hydration', icon: '💧' },
  { key: 'workout', label: 'Workout', icon: '🏋️' },
  { key: 'metrics', label: 'Metrics', icon: '📊' },
  { key: 'library', label: 'Library', icon: '📚' },
]

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

const WORKOUT_ICONS: Record<string, string> = {
  gym: '🏋️',
  cardio: '🏃',
  home: '🏠',
  outdoor: '🌳',
}

// ─────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────

export default function Home() {
  // ── State ──────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [targets, setTargets] = useState<DailyTarget[]>([])
  const [foods, setFoods] = useState<Food[]>([])
  const [todayMeals, setTodayMeals] = useState<MealHistoryItem[]>([])
  const [hydrationLogs, setHydrationLogs] = useState<HydrationLog[]>([])
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseLibrary[]>([])
  const [todayWorkouts, setTodayWorkouts] = useState<Workout[]>([])
  const [activeWorkoutExercises, setActiveWorkoutExercises] = useState<WorkoutExercise[]>([])
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetric[]>([])

  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [selectedFoodId, setSelectedFoodId] = useState<string>('')
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')
  const [activeWorkoutId, setActiveWorkoutId] = useState<string>('')

  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [quantityG, setQuantityG] = useState<string>('100')
  const [waterAmount, setWaterAmount] = useState<string>('250')

  const [sets, setSets] = useState<string>('3')
  const [reps, setReps] = useState<string>('10')
  const [weight, setWeight] = useState<string>('20')

  const [workoutTitle, setWorkoutTitle] = useState<string>('Workout')
  const [workoutType, setWorkoutType] = useState<string>('gym')
  const [workoutDuration, setWorkoutDuration] = useState<string>('60')
  const [workoutNotes, setWorkoutNotes] = useState<string>('')

  const [newExerciseName, setNewExerciseName] = useState<string>('')
  const [newExerciseCategory, setNewExerciseCategory] = useState<string>('strength')
  const [newExerciseMuscle, setNewExerciseMuscle] = useState<string>('')
  const [newExerciseEquipment, setNewExerciseEquipment] = useState<string>('')

  const getLocalDateString = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [metricDate, setMetricDate] = useState<string>(getLocalDateString())
  const [metricWeight, setMetricWeight] = useState<string>('')
  const [metricWaist, setMetricWaist] = useState<string>('')
  const [metricChest, setMetricChest] = useState<string>('')
  const [metricHips, setMetricHips] = useState<string>('')
  const [metricArm, setMetricArm] = useState<string>('')
  const [metricThigh, setMetricThigh] = useState<string>('')
  const [metricBodyFat, setMetricBodyFat] = useState<string>('')
  const [metricMuscleMass, setMetricMuscleMass] = useState<string>('')
  const [metricNotes, setMetricNotes] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [savingMeal, setSavingMeal] = useState(false)
  const [savingWater, setSavingWater] = useState(false)
  const [savingExercise, setSavingExercise] = useState(false)
  const [savingLibraryExercise, setSavingLibraryExercise] = useState(false)
  const [creatingWorkout, setCreatingWorkout] = useState(false)
  const [savingMetric, setSavingMetric] = useState(false)

  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  // ── Data loaders ────────────────────────────

  const loadTodayMeals = async (profileId: string, foodList: Food[]) => {
    const { data: mealsData, error: mealsError } = await supabase
      .from('meals')
      .select(`id, meal_type, meal_date, meal_items ( quantity_g, food_id )`)
      .eq('profile_id', profileId)
      .eq('meal_date', today)
      .order('created_at', { ascending: false })

    if (mealsError) { setError(mealsError.message); return }

    const flattened: MealHistoryItem[] = []
    for (const meal of mealsData || []) {
      for (const item of meal.meal_items || []) {
        const food = foodList.find((f) => f.id === item.food_id)
        if (!food) continue
        const factor = Number(item.quantity_g) / 100
        flattened.push({
          meal_id: meal.id,
          meal_type: meal.meal_type,
          meal_date: meal.meal_date,
          food_name: food.name,
          quantity_g: Number(item.quantity_g),
          calories: Number(((food.calories_kcal || 0) * factor).toFixed(1)),
          protein: Number(((food.protein_g || 0) * factor).toFixed(1)),
          carbs: Number(((food.carbs_g || 0) * factor).toFixed(1)),
          fat: Number(((food.fat_g || 0) * factor).toFixed(1)),
        })
      }
    }
    setTodayMeals(flattened)
  }

  const loadHydrationLogs = async (profileId: string) => {
    const { data, error } = await supabase
      .from('hydration_logs')
      .select('*')
      .eq('profile_id', profileId)
      .eq('log_date', today)
      .order('created_at', { ascending: false })

    if (error) { setError(error.message); return }
    setHydrationLogs(data || [])
  }

  const loadExerciseLibrary = async () => {
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) { setError(error.message); return [] }
    const list = data || []
    setExerciseLibrary(list)
    if (list.length > 0 && !selectedExerciseId) setSelectedExerciseId(list[0].id)
    return list
  }

  const loadTodayWorkouts = async (profileId: string) => {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('profile_id', profileId)
      .eq('workout_date', today)
      .order('created_at', { ascending: false })

    if (error) { setError(error.message); return [] }
    const workouts = data || []
    setTodayWorkouts(workouts)
    if (workouts.length > 0) {
      const stillExists = workouts.some((w) => w.id === activeWorkoutId)
      setActiveWorkoutId(stillExists ? activeWorkoutId : workouts[0].id)
      return workouts
    }
    setActiveWorkoutId('')
    setActiveWorkoutExercises([])
    return workouts
  }

  const loadWorkoutExercises = async (workoutId: string) => {
    if (!workoutId) { setActiveWorkoutExercises([]); return }
    const { data, error } = await supabase
      .from('workout_exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .order('created_at', { ascending: true })

    if (error) { setError(error.message); return }
    setActiveWorkoutExercises(data || [])
  }

  const loadBodyMetrics = async (profileId: string) => {
    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('profile_id', profileId)
      .order('metric_date', { ascending: true })

    if (error) { setError(error.message); return }
    setBodyMetrics(data || [])
  }

  // ── Effects ─────────────────────────────────

  useEffect(() => {
    const loadData = async () => {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles').select('*').order('full_name', { ascending: true })
      if (profilesError) { setError(profilesError.message); setLoading(false); return }

      const { data: targetsData, error: targetsError } = await supabase
        .from('daily_targets').select('*')
      if (targetsError) { setError(targetsError.message); setLoading(false); return }

      const { data: foodsData, error: foodsError } = await supabase
        .from('foods').select('*').order('name', { ascending: true })
      if (foodsError) { setError(foodsError.message); setLoading(false); return }

      const loadedProfiles = profilesData || []
      const loadedFoods = foodsData || []

      setProfiles(loadedProfiles)
      setTargets(targetsData || [])
      setFoods(loadedFoods)

      if (loadedProfiles.length > 0) {
        const firstId = loadedProfiles[0].id
        setSelectedProfileId(firstId)
        await loadTodayMeals(firstId, loadedFoods)
        await loadHydrationLogs(firstId)
        await loadTodayWorkouts(firstId)
        await loadBodyMetrics(firstId)
      }
      if (loadedFoods.length > 0) setSelectedFoodId(loadedFoods[0].id)

      const exercises = await loadExerciseLibrary()
      if (exercises.length > 0) setSelectedExerciseId(exercises[0].id)

      setLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => {
    if (selectedProfileId && foods.length > 0) {
      loadTodayMeals(selectedProfileId, foods)
      loadHydrationLogs(selectedProfileId)
      loadTodayWorkouts(selectedProfileId)
      loadBodyMetrics(selectedProfileId)
    }
  }, [selectedProfileId, foods])

  useEffect(() => {
    if (activeWorkoutId) loadWorkoutExercises(activeWorkoutId)
    else setActiveWorkoutExercises([])
  }, [activeWorkoutId])

  // ── Derived values ──────────────────────────

  const selectedProfile = useMemo(() => profiles.find((p) => p.id === selectedProfileId) || null, [profiles, selectedProfileId])
  const selectedTarget = useMemo(() => targets.find((t) => t.profile_id === selectedProfileId) || null, [targets, selectedProfileId])
  const selectedFood = useMemo(() => foods.find((f) => f.id === selectedFoodId) || null, [foods, selectedFoodId])
  const selectedExercise = useMemo(() => exerciseLibrary.find((e) => e.id === selectedExerciseId) || null, [exerciseLibrary, selectedExerciseId])
  const activeWorkout = useMemo(() => todayWorkouts.find((w) => w.id === activeWorkoutId) || null, [todayWorkouts, activeWorkoutId])

  const quantity = Number(quantityG || 0)
  const waterMl = Number(waterAmount || 0)

  const computedMacros = useMemo(() => {
    if (!selectedFood || quantity <= 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    const factor = quantity / 100
    return {
      calories: Number(((selectedFood.calories_kcal || 0) * factor).toFixed(1)),
      protein: Number(((selectedFood.protein_g || 0) * factor).toFixed(1)),
      carbs: Number(((selectedFood.carbs_g || 0) * factor).toFixed(1)),
      fat: Number(((selectedFood.fat_g || 0) * factor).toFixed(1)),
    }
  }, [selectedFood, quantity])

  const totals = useMemo(() => todayMeals.reduce(
    (acc, item) => ({ calories: acc.calories + item.calories, protein: acc.protein + item.protein, carbs: acc.carbs + item.carbs, fat: acc.fat + item.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  ), [todayMeals])

  const totalWaterToday = useMemo(() => hydrationLogs.reduce((acc, log) => acc + Number(log.amount_ml || 0), 0), [hydrationLogs])
  const totalWorkoutExercisesToday = useMemo(() => todayWorkouts.length, [todayWorkouts])
  const latestMetric = useMemo(() => bodyMetrics.length === 0 ? null : bodyMetrics[bodyMetrics.length - 1], [bodyMetrics])

  const metricChartData = useMemo(() => bodyMetrics.map((item) => ({
    date: item.metric_date,
    weight_kg: item.weight_kg,
    waist_cm: item.waist_cm,
    muscle_mass_kg: item.muscle_mass_kg,
  })), [bodyMetrics])

  // ── Handlers ────────────────────────────────

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 3000)
  }

  const handleAddMeal = async () => {
    setMessage(null); setError(null)
    if (!selectedProfileId) { setError('Select a profile.'); return }
    if (!selectedFoodId) { setError('Select a food.'); return }
    if (!quantity || quantity <= 0) { setError('Quantity must be greater than 0.'); return }
    setSavingMeal(true)

    const { data: mealData, error: mealError } = await supabase
      .from('meals').insert([{ profile_id: selectedProfileId, meal_type: mealType, meal_date: today, notes: null }])
      .select().single()

    if (mealError || !mealData) { setError(mealError?.message || 'Could not create meal.'); setSavingMeal(false); return }

    const { error: mealItemError } = await supabase
      .from('meal_items').insert([{ meal_id: mealData.id, food_id: selectedFoodId, quantity_g: quantity }])

    if (mealItemError) { setError(mealItemError.message); setSavingMeal(false); return }

    await loadTodayMeals(selectedProfileId, foods)
    showMessage('Meal logged successfully.')
    setSavingMeal(false)
  }

  const handleAddWater = async (customAmount?: number) => {
    setMessage(null); setError(null)
    if (!selectedProfileId) { setError('Select a profile.'); return }
    const amountToSave = customAmount ?? waterMl
    if (!amountToSave || amountToSave <= 0) { setError('Water amount must be greater than 0.'); return }
    setSavingWater(true)

    const { error } = await supabase
      .from('hydration_logs').insert([{ profile_id: selectedProfileId, log_date: today, amount_ml: amountToSave }])

    if (error) { setError(error.message); setSavingWater(false); return }

    await loadHydrationLogs(selectedProfileId)
    showMessage(`${amountToSave} ml logged.`)
    setSavingWater(false)
  }

  const handleCreateWorkout = async () => {
    setMessage(null); setError(null)
    if (!selectedProfileId) { setError('Select a profile.'); return }
    if (!workoutTitle.trim()) { setError('Enter a workout title.'); return }
    setCreatingWorkout(true)

    const { data, error } = await supabase
      .from('workouts').insert([{
        profile_id: selectedProfileId,
        workout_date: today,
        workout_type: workoutType,
        title: workoutTitle.trim(),
        duration_min: workoutDuration ? Number(workoutDuration) : null,
        notes: workoutNotes.trim() || null,
      }]).select().single()

    if (error || !data) { setError(error?.message || 'Could not create workout.'); setCreatingWorkout(false); return }

    await loadTodayWorkouts(selectedProfileId)
    setActiveWorkoutId(data.id)
    showMessage('Workout created.')
    setCreatingWorkout(false)
  }

  const handleAddWorkoutExercise = async () => {
    setMessage(null); setError(null)
    if (!activeWorkoutId) { setError('Create or select an active workout.'); return }
    if (!selectedExerciseId) { setError('Select an exercise.'); return }
    setSavingExercise(true)

    const { error } = await supabase
      .from('workout_exercises').insert([{
        workout_id: activeWorkoutId,
        exercise_name: selectedExercise?.name || 'Exercise',
        exercise_library_id: selectedExerciseId,
        sets: Number(sets),
        reps: Number(reps),
        weight_kg: Number(weight),
      }])

    if (error) { setError(error.message); setSavingExercise(false); return }

    await loadWorkoutExercises(activeWorkoutId)
    showMessage('Exercise added.')
    setSavingExercise(false)
  }

  const handleAddExerciseToLibrary = async () => {
    setMessage(null); setError(null)
    if (!newExerciseName.trim()) { setError('Enter exercise name.'); return }
    setSavingLibraryExercise(true)

    const { error } = await supabase
      .from('exercise_library').insert([{
        name: newExerciseName.trim(),
        category: newExerciseCategory,
        muscle_group: newExerciseMuscle.trim() || null,
        equipment: newExerciseEquipment.trim() || null,
        is_active: true,
      }])

    if (error) { setError(error.message); setSavingLibraryExercise(false); return }

    const refreshed = await loadExerciseLibrary()
    const created = refreshed.find((ex) => ex.name.toLowerCase() === newExerciseName.trim().toLowerCase())
    if (created) setSelectedExerciseId(created.id)

    setNewExerciseName(''); setNewExerciseCategory('strength'); setNewExerciseMuscle(''); setNewExerciseEquipment('')
    showMessage('Exercise added to library.')
    setSavingLibraryExercise(false)
  }

  const handleSaveMetric = async () => {
    setMessage(null); setError(null)
    if (!selectedProfileId) { setError('Select a profile.'); return }
    if (!metricDate) { setError('Select a date.'); return }
    setSavingMetric(true)

    const { error } = await supabase
      .from('body_metrics').insert([{
        profile_id: selectedProfileId,
        metric_date: metricDate,
        weight_kg: metricWeight ? Number(metricWeight) : null,
        chest_cm: metricChest ? Number(metricChest) : null,
        waist_cm: metricWaist ? Number(metricWaist) : null,
        hips_cm: metricHips ? Number(metricHips) : null,
        arm_cm: metricArm ? Number(metricArm) : null,
        thigh_cm: metricThigh ? Number(metricThigh) : null,
        body_fat_percent: metricBodyFat ? Number(metricBodyFat) : null,
        muscle_mass_kg: metricMuscleMass ? Number(metricMuscleMass) : null,
        notes: metricNotes.trim() || null,
      }])

    if (error) { setError(error.message); setSavingMetric(false); return }

    await loadBodyMetrics(selectedProfileId)
    showMessage('Body metrics saved.')
    setSavingMetric(false)
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#08080f] text-white flex">

      {/* ══ SIDEBAR (desktop) ══ */}
      <aside className="hidden md:flex flex-col w-56 xl:w-64 border-r border-white/[0.06] shrink-0 sticky top-0 h-screen">
        {/* Brand */}
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-base shrink-0">
              ⚡
            </div>
            <div>
              <h1 className="text-sm font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent leading-tight">
                FitPersonal
              </h1>
              <p className="text-[10px] text-white/25 leading-none">Pro Dashboard</p>
            </div>
          </div>
        </div>

        {/* Profile selector */}
        <div className="p-3 border-b border-white/[0.06]">
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5 px-1">Profile</p>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
          >
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>

        {/* Navigation */}
        <nav className="p-2 flex-1 overflow-y-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mb-0.5 text-left
                ${activeTab === tab.key
                  ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-white border border-cyan-500/20'
                  : 'text-white/40 hover:text-white hover:bg-white/[0.05]'
                }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
              {activeTab === tab.key && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/[0.06]">
          <p className="text-[10px] text-white/15 text-center">FitPersonal Pro v1.0</p>
        </div>
      </aside>

      {/* ══ MAIN CONTENT ══ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-20 bg-[#08080f]/90 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-xs shrink-0">⚡</div>
              <span className="text-sm font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                FitPersonal Pro
              </span>
            </div>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>

          {/* Scrollable tab row */}
          <div className="flex overflow-x-auto gap-1 px-3 pb-2.5 scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all
                  ${activeTab === tab.key
                    ? 'bg-gradient-to-r from-cyan-500/25 to-indigo-500/25 text-white border border-cyan-500/25'
                    : 'text-white/35 hover:text-white'
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">

          {/* Toast messages */}
          {(message || error) && (
            <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2.5 border
              ${message
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              <span className="text-base">{message ? '✓' : '✕'}</span>
              {message || error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/10 border border-white/08 flex items-center justify-center mx-auto">
                  <Spinner />
                </div>
                <p className="text-white/30 text-sm">Loading your data…</p>
              </div>
            </div>
          ) : (
            <>
              {/* ══════════════════════════════════════
                  DASHBOARD TAB
              ══════════════════════════════════════ */}
              {activeTab === 'dashboard' && (
                <div className="space-y-5">
                  {/* Greeting */}
                  <div>
                    <h2 className="text-2xl font-bold">
                      Hey, {selectedProfile?.full_name?.split(' ')[0] || 'there'} 👋
                    </h2>
                    <p className="text-white/35 text-sm mt-0.5">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </div>

                  {/* Primary metrics row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Calorie ring */}
                    <GlassCard className="p-5 flex flex-col items-center">
                      <SectionLabel>Calories Today</SectionLabel>
                      <CalorieRing consumed={totals.calories} target={selectedTarget?.calories_kcal || 0} />
                      <p className="text-xs text-white/25 mt-2">
                        Target: {selectedTarget?.calories_kcal ?? '—'} kcal
                      </p>
                    </GlassCard>

                    {/* Macros */}
                    <GlassCard className="p-5">
                      <SectionLabel>Macronutrients</SectionLabel>
                      <div className="space-y-4 mt-2">
                        <MacroBar label="Protein" value={totals.protein} target={selectedTarget?.protein_g || 0} from="#f97316" to="#fb923c" />
                        <MacroBar label="Carbohydrates" value={totals.carbs} target={selectedTarget?.carbs_g || 0} from="#eab308" to="#facc15" />
                        <MacroBar label="Fat" value={totals.fat} target={selectedTarget?.fat_g || 0} from="#ec4899" to="#f472b6" />
                      </div>
                      <div className="mt-5 pt-4 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-sm font-bold text-orange-400">{Math.round(totals.protein)}g</p>
                          <p className="text-[10px] text-white/30 mt-0.5">protein</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-yellow-400">{Math.round(totals.carbs)}g</p>
                          <p className="text-[10px] text-white/30 mt-0.5">carbs</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-pink-400">{Math.round(totals.fat)}g</p>
                          <p className="text-[10px] text-white/30 mt-0.5">fat</p>
                        </div>
                      </div>
                    </GlassCard>

                    {/* Hydration */}
                    <GlassCard className="p-5 flex flex-col items-center">
                      <SectionLabel>Hydration</SectionLabel>
                      <WaterRing consumed={totalWaterToday} target={selectedTarget?.water_ml || 2000} />
                      <div className="w-full mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white/[0.04] rounded-xl py-2">
                          <p className="text-sm font-bold text-cyan-400">{Math.round((totalWaterToday / (selectedTarget?.water_ml || 2000)) * 100)}%</p>
                          <p className="text-[10px] text-white/25 mt-0.5">done</p>
                        </div>
                        <div className="bg-white/[0.04] rounded-xl py-2">
                          <p className="text-sm font-bold text-white">{Math.round(totalWaterToday / 250)}</p>
                          <p className="text-[10px] text-white/25 mt-0.5">cups</p>
                        </div>
                        <div className="bg-white/[0.04] rounded-xl py-2">
                          <p className="text-sm font-bold text-white">{Math.max(0, Math.round(((selectedTarget?.water_ml || 2000) - totalWaterToday) / 250))}</p>
                          <p className="text-[10px] text-white/25 mt-0.5">left</p>
                        </div>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatMini label="Calories consumed" value={Math.round(totals.calories)} unit="kcal" accent="#06b6d4" />
                    <StatMini label="Protein today" value={Math.round(totals.protein)} unit="g" accent="#f97316" />
                    <StatMini label="Water intake" value={(totalWaterToday / 1000).toFixed(1)} unit="L" accent="#0ea5e9" />
                    <StatMini label="Workouts logged" value={totalWorkoutExercisesToday} unit="sessions" accent="#a78bfa" />
                  </div>

                  {/* Profile + Recent meals */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Profile card */}
                    {selectedProfile && (
                      <GlassCard className="p-5">
                        <SectionLabel>Profile</SectionLabel>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-white/08 flex items-center justify-center text-2xl shrink-0">
                            👤
                          </div>
                          <div>
                            <p className="font-semibold text-white">{selectedProfile.full_name}</p>
                            <p className="text-xs text-white/35 mt-0.5">
                              {selectedProfile.age ? `${selectedProfile.age} yrs` : '—'}
                              {selectedProfile.height_cm ? ` · ${selectedProfile.height_cm} cm` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-white/[0.04] rounded-xl p-3">
                            <p className="text-xs text-white/35">Current</p>
                            <p className="text-xl font-bold mt-0.5">
                              {selectedProfile.current_weight_kg ?? '—'}
                              <span className="text-sm font-normal text-white/30"> kg</span>
                            </p>
                          </div>
                          <div className="bg-white/[0.04] rounded-xl p-3">
                            <p className="text-xs text-white/35">Goal</p>
                            <p className="text-xl font-bold mt-0.5">
                              {selectedProfile.goal_weight_kg ?? '—'}
                              <span className="text-sm font-normal text-white/30"> kg</span>
                            </p>
                          </div>
                        </div>
                        {selectedProfile.goal_type && <Badge variant="cyan">{selectedProfile.goal_type}</Badge>}
                        {selectedTarget && (
                          <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-center">
                            <div>
                              <p className="text-sm font-semibold text-white">{selectedTarget.calories_kcal ?? '—'}</p>
                              <p className="text-[10px] text-white/30">kcal / day</p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">{selectedTarget.water_ml ? `${(selectedTarget.water_ml / 1000).toFixed(1)}L` : '—'}</p>
                              <p className="text-[10px] text-white/30">water / day</p>
                            </div>
                          </div>
                        )}
                      </GlassCard>
                    )}

                    {/* Recent meals */}
                    <GlassCard className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <SectionLabel>Recent Meals</SectionLabel>
                        <button onClick={() => setActiveTab('nutrition')} className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors">
                          View all →
                        </button>
                      </div>
                      {todayMeals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                          <span className="text-3xl">🍽️</span>
                          <p className="text-sm text-white/25">No meals logged today</p>
                          <Btn variant="outline" size="sm" onClick={() => setActiveTab('nutrition')}>Log a meal</Btn>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {todayMeals.slice(-5).reverse().map((meal) => (
                            <div key={meal.meal_id} className="flex items-center justify-between py-2.5 px-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-sm shrink-0">{MEAL_ICONS[meal.meal_type] || '🍴'}</span>
                                <div className="min-w-0">
                                  <p className="text-sm text-white truncate">{meal.food_name}</p>
                                  <p className="text-xs text-white/30 capitalize">{meal.meal_type} · {meal.quantity_g}g</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <p className="text-sm font-semibold text-white">{Math.round(meal.calories)}</p>
                                <p className="text-[10px] text-white/30">kcal</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </GlassCard>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════
                  NUTRITION TAB
              ══════════════════════════════════════ */}
              {activeTab === 'nutrition' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">Nutrition</h2>
                    <p className="text-white/35 text-sm mt-0.5">Track your daily food intake</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Log meal form */}
                    <GlassCard className="p-5">
                      <SectionLabel>Log a Meal</SectionLabel>
                      <div className="space-y-3 mt-1">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-white/40">Meal Type</label>
                          <select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)} className={selectCls}>
                            <option value="breakfast">🌅 Breakfast</option>
                            <option value="lunch">☀️ Lunch</option>
                            <option value="dinner">🌙 Dinner</option>
                            <option value="snack">🍎 Snack</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-white/40">Food</label>
                          <select value={selectedFoodId} onChange={(e) => setSelectedFoodId(e.target.value)} className={selectCls}>
                            <option value="">Select food…</option>
                            {foods.map((f) => (
                              <option key={f.id} value={f.id}>{f.name}{f.brand ? ` (${f.brand})` : ''}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-white/40">Quantity (g)</label>
                          <input type="number" value={quantityG} onChange={(e) => setQuantityG(e.target.value)} placeholder="100" className={inputCls} />
                        </div>
                        <Btn onClick={handleAddMeal} loading={savingMeal} className="w-full mt-1">
                          Log Meal
                        </Btn>
                      </div>
                    </GlassCard>

                    {/* Preview */}
                    {selectedFood ? (
                      <GlassCard className="p-5">
                        <SectionLabel>Nutritional Preview</SectionLabel>
                        <div className="mb-3">
                          <p className="font-semibold text-white">{selectedFood.name}</p>
                          <p className="text-xs text-white/35 mt-0.5">{quantityG}g serving</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 border border-cyan-500/10 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold">{Math.round(computedMacros.calories)}</p>
                            <p className="text-[10px] text-white/35 mt-0.5 uppercase tracking-wider">Calories</p>
                          </div>
                          <div className="bg-orange-500/10 border border-orange-500/10 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-orange-400">{Math.round(computedMacros.protein)}g</p>
                            <p className="text-[10px] text-white/35 mt-0.5 uppercase tracking-wider">Protein</p>
                          </div>
                          <div className="bg-yellow-500/10 border border-yellow-500/10 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-yellow-400">{Math.round(computedMacros.carbs)}g</p>
                            <p className="text-[10px] text-white/35 mt-0.5 uppercase tracking-wider">Carbs</p>
                          </div>
                          <div className="bg-pink-500/10 border border-pink-500/10 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-pink-400">{Math.round(computedMacros.fat)}g</p>
                            <p className="text-[10px] text-white/35 mt-0.5 uppercase tracking-wider">Fat</p>
                          </div>
                        </div>
                        {selectedFood.serving_size_g && (
                          <p className="text-xs text-white/25 mt-3 text-center">Per 100g: {selectedFood.calories_kcal} kcal</p>
                        )}
                      </GlassCard>
                    ) : (
                      <GlassCard className="p-5 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-3xl mb-2">🥗</p>
                          <p className="text-sm text-white/25">Select a food to preview its macros</p>
                        </div>
                      </GlassCard>
                    )}
                  </div>

                  {/* Today's meals list */}
                  <GlassCard className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <SectionLabel>Today&apos;s Meals</SectionLabel>
                      <div className="flex items-center gap-3 text-xs text-white/35">
                        <span>{Math.round(totals.calories)} kcal</span>
                        <span>·</span>
                        <span>P {Math.round(totals.protein)}g</span>
                        <span>·</span>
                        <span>C {Math.round(totals.carbs)}g</span>
                        <span>·</span>
                        <span>F {Math.round(totals.fat)}g</span>
                      </div>
                    </div>

                    {todayMeals.length === 0 ? (
                      <p className="text-white/25 text-sm text-center py-6">No meals logged today</p>
                    ) : (
                      <div>
                        {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => {
                          const group = todayMeals.filter((m) => m.meal_type === type)
                          if (group.length === 0) return null
                          const groupCals = group.reduce((s, m) => s + m.calories, 0)
                          return (
                            <div key={type} className="mb-4 last:mb-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-xs font-semibold text-white/35 uppercase tracking-wider flex items-center gap-1.5">
                                  <span>{MEAL_ICONS[type]}</span> {type}
                                </p>
                                <span className="text-xs text-white/25">{Math.round(groupCals)} kcal</span>
                              </div>
                              {group.map((meal) => (
                                <div key={meal.meal_id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/[0.04] transition-colors">
                                  <div className="min-w-0">
                                    <p className="text-sm text-white truncate">{meal.food_name}</p>
                                    <p className="text-xs text-white/30">{meal.quantity_g}g</p>
                                  </div>
                                  <div className="text-right shrink-0 ml-3">
                                    <p className="text-sm font-medium text-white">{Math.round(meal.calories)} kcal</p>
                                    <p className="text-[11px] text-white/30">
                                      P {Math.round(meal.protein)} · C {Math.round(meal.carbs)} · F {Math.round(meal.fat)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </GlassCard>
                </div>
              )}

              {/* ══════════════════════════════════════
                  HYDRATION TAB
              ══════════════════════════════════════ */}
              {activeTab === 'hydration' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">Hydration</h2>
                    <p className="text-white/35 text-sm mt-0.5">Stay on top of your water intake</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Status */}
                    <GlassCard className="p-5 flex flex-col items-center">
                      <SectionLabel>Today&apos;s Progress</SectionLabel>
                      <div className="py-3">
                        <WaterRing consumed={totalWaterToday} target={selectedTarget?.water_ml || 2000} />
                      </div>
                      <div className="w-full grid grid-cols-3 gap-2 mt-2 text-center">
                        <div className="bg-cyan-500/10 border border-cyan-500/10 rounded-xl py-2.5">
                          <p className="text-lg font-bold text-cyan-400">{Math.round((totalWaterToday / (selectedTarget?.water_ml || 2000)) * 100)}%</p>
                          <p className="text-[10px] text-white/30 mt-0.5">Complete</p>
                        </div>
                        <div className="bg-white/[0.04] rounded-xl py-2.5">
                          <p className="text-lg font-bold text-white">{Math.round(totalWaterToday / 250)}</p>
                          <p className="text-[10px] text-white/30 mt-0.5">Cups drunk</p>
                        </div>
                        <div className="bg-white/[0.04] rounded-xl py-2.5">
                          <p className="text-lg font-bold text-white">{Math.max(0, Math.round(((selectedTarget?.water_ml || 2000) - totalWaterToday) / 250))}</p>
                          <p className="text-[10px] text-white/30 mt-0.5">Cups left</p>
                        </div>
                      </div>
                    </GlassCard>

                    {/* Log water */}
                    <GlassCard className="p-5">
                      <SectionLabel>Log Water</SectionLabel>
                      <div className="space-y-4 mt-1">
                        <div>
                          <p className="text-xs text-white/35 mb-2">Quick add</p>
                          <div className="grid grid-cols-4 gap-2">
                            {[150, 250, 350, 500].map((amt) => (
                              <button
                                key={amt}
                                onClick={() => handleAddWater(amt)}
                                className="py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/15 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 active:scale-95 transition-all"
                              >
                                {amt}ml
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 border-t border-white/[0.06]" />
                          <span className="text-xs text-white/20">or custom</span>
                          <div className="flex-1 border-t border-white/[0.06]" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-white/40">Amount (ml)</label>
                          <input type="number" value={waterAmount} onChange={(e) => setWaterAmount(e.target.value)} placeholder="250" className={inputCls} />
                        </div>

                        <Btn onClick={() => handleAddWater()} loading={savingWater} className="w-full">
                          💧 Add Water
                        </Btn>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Log entries */}
                  <GlassCard className="p-5">
                    <SectionLabel>Today&apos;s Log</SectionLabel>
                    {hydrationLogs.length === 0 ? (
                      <p className="text-white/25 text-sm text-center py-6">No water logged today</p>
                    ) : (
                      <div className="space-y-1">
                        {[...hydrationLogs].reverse().map((log, i) => (
                          <div key={log.id} className={`flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/[0.03] transition-colors ${i === 0 ? 'bg-cyan-500/[0.04] border border-cyan-500/10' : ''}`}>
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center text-xs shrink-0">💧</div>
                              <span className="text-sm text-white font-medium">{log.amount_ml} ml</span>
                              {i === 0 && <Badge variant="cyan">latest</Badge>}
                            </div>
                            <span className="text-xs text-white/25">
                              {new Date(log.log_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                        <div className="pt-3 border-t border-white/[0.06] flex justify-between items-center">
                          <span className="text-xs text-white/30">Total today</span>
                          <span className="text-sm font-semibold text-cyan-400">{(totalWaterToday / 1000).toFixed(2)} L</span>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                </div>
              )}

              {/* ══════════════════════════════════════
                  WORKOUT TAB
              ══════════════════════════════════════ */}
              {activeTab === 'workout' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">Workout</h2>
                    <p className="text-white/35 text-sm mt-0.5">Build and track your sessions</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Create workout */}
                    <GlassCard className="p-5">
                      <SectionLabel>New Session</SectionLabel>
                      <div className="space-y-3 mt-1">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-white/40">Title</label>
                          <input value={workoutTitle} onChange={(e) => setWorkoutTitle(e.target.value)} placeholder="Morning Strength" className={inputCls} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/40">Type</label>
                            <select value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} className={selectCls}>
                              <option value="gym">🏋️ Gym</option>
                              <option value="cardio">🏃 Cardio</option>
                              <option value="home">🏠 Home</option>
                              <option value="outdoor">🌳 Outdoor</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/40">Duration (min)</label>
                            <input type="number" value={workoutDuration} onChange={(e) => setWorkoutDuration(e.target.value)} placeholder="60" className={inputCls} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-white/40">Notes (optional)</label>
                          <input value={workoutNotes} onChange={(e) => setWorkoutNotes(e.target.value)} placeholder="Focus on form…" className={inputCls} />
                        </div>
                        <Btn onClick={handleCreateWorkout} loading={creatingWorkout} className="w-full">
                          🏋️ Create Workout
                        </Btn>
                      </div>
                    </GlassCard>

                    {/* Add exercise */}
                    <GlassCard className="p-5">
                      <SectionLabel>Add Exercise</SectionLabel>
                      <div className="space-y-3 mt-1">
                        {todayWorkouts.length > 0 && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/40">Active Workout</label>
                            <select value={activeWorkoutId} onChange={(e) => setActiveWorkoutId(e.target.value)} className={selectCls}>
                              <option value="">Select workout…</option>
                              {todayWorkouts.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
                            </select>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-white/40">Exercise</label>
                          <select value={selectedExerciseId} onChange={(e) => setSelectedExerciseId(e.target.value)} className={selectCls}>
                            <option value="">Select exercise…</option>
                            {exerciseLibrary.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                          </select>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Sets', val: sets, set: setSets },
                            { label: 'Reps', val: reps, set: setReps },
                            { label: 'kg', val: weight, set: setWeight },
                          ].map(({ label, val, set }) => (
                            <div key={label} className="space-y-1.5">
                              <label className="text-xs font-medium text-white/40">{label}</label>
                              <input type="number" value={val} onChange={(e) => set(e.target.value)} className={inputCls} />
                            </div>
                          ))}
                        </div>

                        <Btn onClick={handleAddWorkoutExercise} loading={savingExercise} disabled={!activeWorkoutId} className="w-full">
                          + Add Exercise
                        </Btn>
                        {!activeWorkoutId && todayWorkouts.length === 0 && (
                          <p className="text-xs text-white/25 text-center">Create a workout first</p>
                        )}
                      </div>
                    </GlassCard>
                  </div>

                  {/* Today's workouts */}
                  {todayWorkouts.length > 0 && (
                    <GlassCard className="p-5">
                      <SectionLabel>Today&apos;s Sessions</SectionLabel>
                      <div className="space-y-2 mt-1">
                        {todayWorkouts.map((workout) => (
                          <button
                            key={workout.id}
                            onClick={() => setActiveWorkoutId(workout.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left
                              ${activeWorkoutId === workout.id
                                ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 border border-cyan-500/20'
                                : 'bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06]'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0
                                ${activeWorkoutId === workout.id ? 'bg-cyan-500/20' : 'bg-white/[0.05]'}`}>
                                {WORKOUT_ICONS[workout.workout_type] || '🏃'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{workout.title}</p>
                                <p className="text-xs text-white/35 capitalize">
                                  {workout.workout_type}
                                  {workout.duration_min ? ` · ${workout.duration_min} min` : ''}
                                </p>
                              </div>
                            </div>
                            {activeWorkoutId === workout.id && <Badge variant="cyan">Active</Badge>}
                          </button>
                        ))}
                      </div>
                    </GlassCard>
                  )}

                  {/* Exercises in active workout */}
                  {activeWorkoutId && activeWorkoutExercises.length > 0 && (
                    <GlassCard className="p-5">
                      <SectionLabel>Exercises — {activeWorkout?.title}</SectionLabel>
                      <div className="space-y-2 mt-1">
                        {activeWorkoutExercises.map((ex, i) => (
                          <div key={ex.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                            <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{ex.exercise_name}</p>
                              <p className="text-xs text-white/35">
                                {ex.sets} sets × {ex.reps} reps{ex.weight_kg ? ` · ${ex.weight_kg} kg` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Badge variant="violet">{ex.sets}×{ex.reps}</Badge>
                              {ex.weight_kg ? <Badge variant="cyan">{ex.weight_kg}kg</Badge> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════
                  METRICS TAB
              ══════════════════════════════════════ */}
              {activeTab === 'metrics' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">Body Metrics</h2>
                    <p className="text-white/35 text-sm mt-0.5">Track your physical progress over time</p>
                  </div>

                  {/* Latest stats */}
                  {latestMetric && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <StatMini label="Weight" value={latestMetric.weight_kg ?? '—'} unit="kg" accent="#22c55e" />
                      <StatMini label="Body fat" value={latestMetric.body_fat_percent ? `${latestMetric.body_fat_percent}%` : '—'} accent="#ef4444" />
                      <StatMini label="Muscle mass" value={latestMetric.muscle_mass_kg ?? '—'} unit="kg" accent="#a78bfa" />
                      <StatMini label="Waist" value={latestMetric.waist_cm ?? '—'} unit="cm" accent="#f97316" />
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Form */}
                    <GlassCard className="p-5">
                      <SectionLabel>Log Measurements</SectionLabel>
                      <div className="space-y-3 mt-1">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-white/40">Date</label>
                          <input type="date" value={metricDate} onChange={(e) => setMetricDate(e.target.value)} className={inputCls} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Weight (kg)', val: metricWeight, set: setMetricWeight, ph: '70.5' },
                            { label: 'Body Fat (%)', val: metricBodyFat, set: setMetricBodyFat, ph: '15' },
                            { label: 'Muscle Mass (kg)', val: metricMuscleMass, set: setMetricMuscleMass, ph: '55' },
                            { label: 'Waist (cm)', val: metricWaist, set: setMetricWaist, ph: '80' },
                            { label: 'Chest (cm)', val: metricChest, set: setMetricChest, ph: '100' },
                            { label: 'Hips (cm)', val: metricHips, set: setMetricHips, ph: '95' },
                            { label: 'Arm (cm)', val: metricArm, set: setMetricArm, ph: '35' },
                            { label: 'Thigh (cm)', val: metricThigh, set: setMetricThigh, ph: '55' },
                          ].map(({ label, val, set, ph }) => (
                            <div key={label} className="space-y-1.5">
                              <label className="text-xs font-medium text-white/40">{label}</label>
                              <input type="number" value={val} onChange={(e) => set(e.target.value)} placeholder={ph} className={inputCls} />
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-white/40">Notes</label>
                          <input value={metricNotes} onChange={(e) => setMetricNotes(e.target.value)} placeholder="Feeling great today…" className={inputCls} />
                        </div>
                        <Btn onClick={handleSaveMetric} loading={savingMetric} className="w-full">
                          Save Measurements
                        </Btn>
                      </div>
                    </GlassCard>

                    {/* Charts */}
                    <div className="space-y-4">
                      {metricChartData.length > 1 ? (
                        <>
                          {[
                            { key: 'weight_kg', label: 'Weight Progress', color: '#22c55e', unit: 'kg' },
                            { key: 'waist_cm', label: 'Waist Progress', color: '#06b6d4', unit: 'cm' },
                            { key: 'muscle_mass_kg', label: 'Muscle Mass', color: '#a78bfa', unit: 'kg' },
                          ].map(({ key, label, color }) => (
                            <GlassCard key={key} className="p-5">
                              <SectionLabel>{label}</SectionLabel>
                              <div className="h-44">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={metricChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} />
                                    <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2.5} dot={false} strokeLinecap="round" />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </GlassCard>
                          ))}
                        </>
                      ) : (
                        <GlassCard className="p-8 flex flex-col items-center justify-center gap-3">
                          <span className="text-4xl">📊</span>
                          <p className="text-white/30 text-sm text-center">Log at least 2 measurements to see your progress charts</p>
                        </GlassCard>
                      )}
                    </div>
                  </div>

                  {/* History table */}
                  {bodyMetrics.length > 0 && (
                    <GlassCard className="p-5">
                      <SectionLabel>Measurement History</SectionLabel>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-[480px]">
                          <thead>
                            <tr className="border-b border-white/[0.06]">
                              {['Date', 'Weight', 'Fat %', 'Muscle', 'Waist', 'Chest', 'Hips'].map((h) => (
                                <th key={h} className="text-left py-2.5 pr-4 font-medium text-white/30 first:pl-0">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[...bodyMetrics].reverse().slice(0, 10).map((m) => (
                              <tr key={m.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                <td className="py-2.5 pr-4 text-white/50">{new Date(m.metric_date).toLocaleDateString()}</td>
                                <td className="py-2.5 pr-4 text-white font-medium">{m.weight_kg ?? '—'}</td>
                                <td className="py-2.5 pr-4 text-white">{m.body_fat_percent ? `${m.body_fat_percent}%` : '—'}</td>
                                <td className="py-2.5 pr-4 text-white">{m.muscle_mass_kg ?? '—'}</td>
                                <td className="py-2.5 pr-4 text-white">{m.waist_cm ?? '—'}</td>
                                <td className="py-2.5 pr-4 text-white">{m.chest_cm ?? '—'}</td>
                                <td className="py-2.5 text-white">{m.hips_cm ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </GlassCard>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════
                  LIBRARY TAB
              ══════════════════════════════════════ */}
              {activeTab === 'library' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold">Exercise Library</h2>
                    <p className="text-white/35 text-sm mt-0.5">Manage your exercise database</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Add exercise */}
                    <GlassCard className="p-5">
                      <SectionLabel>Add New Exercise</SectionLabel>
                      <div className="space-y-3 mt-1">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-white/40">Exercise Name</label>
                          <input value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} placeholder="Barbell Bench Press" className={inputCls} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/40">Category</label>
                            <select value={newExerciseCategory} onChange={(e) => setNewExerciseCategory(e.target.value)} className={selectCls}>
                              <option value="strength">💪 Strength</option>
                              <option value="cardio">🏃 Cardio</option>
                              <option value="flexibility">🧘 Flexibility</option>
                              <option value="balance">⚖️ Balance</option>
                              <option value="sports">⚽ Sports</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/40">Muscle Group</label>
                            <input value={newExerciseMuscle} onChange={(e) => setNewExerciseMuscle(e.target.value)} placeholder="Chest" className={inputCls} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-white/40">Equipment</label>
                          <input value={newExerciseEquipment} onChange={(e) => setNewExerciseEquipment(e.target.value)} placeholder="Barbell, bench" className={inputCls} />
                        </div>
                        <Btn onClick={handleAddExerciseToLibrary} loading={savingLibraryExercise} className="w-full">
                          + Add to Library
                        </Btn>
                      </div>
                    </GlassCard>

                    {/* Library list */}
                    <GlassCard className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <SectionLabel>All Exercises</SectionLabel>
                        <Badge variant="cyan">{exerciseLibrary.length} exercises</Badge>
                      </div>
                      <div className="space-y-0.5 max-h-[420px] overflow-y-auto -mx-1 px-1">
                        {exerciseLibrary.length === 0 ? (
                          <p className="text-white/25 text-sm text-center py-6">Library is empty</p>
                        ) : (
                          exerciseLibrary.map((ex) => {
                            const catVariant: Record<string, string> = {
                              strength: 'orange', cardio: 'cyan', flexibility: 'green', balance: 'amber', sports: 'violet',
                            }
                            return (
                              <div key={ex.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors truncate">{ex.name}</p>
                                  <p className="text-xs text-white/30 mt-0.5">
                                    {ex.muscle_group ? `${ex.muscle_group} · ` : ''}{ex.equipment || 'Bodyweight'}
                                  </p>
                                </div>
                                {ex.category && (
                                  <Badge variant={catVariant[ex.category] || 'cyan'}>{ex.category}</Badge>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </GlassCard>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
