'use client'
import BodyMetricsChart from '@/components/BodyMetricsChart'
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

type TabKey =
  | 'dashboard'
  | 'nutrition'
  | 'hydration'
  | 'workout'
  | 'metrics'
  | 'library'

export default function Home() {
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

  const loadTodayMeals = async (profileId: string, foodList: Food[]) => {
    const { data: mealsData, error: mealsError } = await supabase
      .from('meals')
      .select(`
        id,
        meal_type,
        meal_date,
        meal_items (
          quantity_g,
          food_id
        )
      `)
      .eq('profile_id', profileId)
      .eq('meal_date', today)
      .order('created_at', { ascending: false })

    if (mealsError) {
      setError(mealsError.message)
      return
    }

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

    if (error) {
      setError(error.message)
      return
    }

    setHydrationLogs(data || [])
  }

  const loadExerciseLibrary = async () => {
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      setError(error.message)
      return []
    }

    const list = data || []
    setExerciseLibrary(list)

    if (list.length > 0 && !selectedExerciseId) {
      setSelectedExerciseId(list[0].id)
    }

    return list
  }

  const loadTodayWorkouts = async (profileId: string) => {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('profile_id', profileId)
      .eq('workout_date', today)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      return []
    }

    const workouts = data || []
    setTodayWorkouts(workouts)

    if (workouts.length > 0) {
      const stillExists = workouts.some((w) => w.id === activeWorkoutId)
      const nextActiveId = stillExists ? activeWorkoutId : workouts[0].id
      setActiveWorkoutId(nextActiveId)
      return workouts
    }

    setActiveWorkoutId('')
    setActiveWorkoutExercises([])
    return workouts
  }

  const loadWorkoutExercises = async (workoutId: string) => {
    if (!workoutId) {
      setActiveWorkoutExercises([])
      return
    }

    const { data, error } = await supabase
      .from('workout_exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
      return
    }

    setActiveWorkoutExercises(data || [])
  }

  const loadBodyMetrics = async (profileId: string) => {
    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('profile_id', profileId)
      .order('metric_date', { ascending: true })

    if (error) {
      setError(error.message)
      return
    }

    setBodyMetrics(data || [])
  }

  useEffect(() => {
    const loadData = async () => {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true })

      if (profilesError) {
        setError(profilesError.message)
        setLoading(false)
        return
      }

      const { data: targetsData, error: targetsError } = await supabase
        .from('daily_targets')
        .select('*')

      if (targetsError) {
        setError(targetsError.message)
        setLoading(false)
        return
      }

      const { data: foodsData, error: foodsError } = await supabase
        .from('foods')
        .select('*')
        .order('name', { ascending: true })

      if (foodsError) {
        setError(foodsError.message)
        setLoading(false)
        return
      }

      const loadedProfiles = profilesData || []
      const loadedFoods = foodsData || []

      setProfiles(loadedProfiles)
      setTargets(targetsData || [])
      setFoods(loadedFoods)

      if (loadedProfiles.length > 0) {
        const firstProfileId = loadedProfiles[0].id
        setSelectedProfileId(firstProfileId)
        await loadTodayMeals(firstProfileId, loadedFoods)
        await loadHydrationLogs(firstProfileId)
        await loadTodayWorkouts(firstProfileId)
        await loadBodyMetrics(firstProfileId)
      }

      if (loadedFoods.length > 0) {
        setSelectedFoodId(loadedFoods[0].id)
      }

      const exercises = await loadExerciseLibrary()
      if (exercises.length > 0) {
        setSelectedExerciseId(exercises[0].id)
      }

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
    if (activeWorkoutId) {
      loadWorkoutExercises(activeWorkoutId)
    } else {
      setActiveWorkoutExercises([])
    }
  }, [activeWorkoutId])

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId) || null,
    [profiles, selectedProfileId]
  )

  const selectedTarget = useMemo(
    () => targets.find((t) => t.profile_id === selectedProfileId) || null,
    [targets, selectedProfileId]
  )

  const selectedFood = useMemo(
    () => foods.find((f) => f.id === selectedFoodId) || null,
    [foods, selectedFoodId]
  )

  const selectedExercise = useMemo(
    () => exerciseLibrary.find((e) => e.id === selectedExerciseId) || null,
    [exerciseLibrary, selectedExerciseId]
  )

  const activeWorkout = useMemo(
    () => todayWorkouts.find((w) => w.id === activeWorkoutId) || null,
    [todayWorkouts, activeWorkoutId]
  )

  const quantity = Number(quantityG || 0)
  const waterMl = Number(waterAmount || 0)

  const computedMacros = useMemo(() => {
    if (!selectedFood || !quantity || quantity <= 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    }

    const factor = quantity / 100

    return {
      calories: Number(((selectedFood.calories_kcal || 0) * factor).toFixed(1)),
      protein: Number(((selectedFood.protein_g || 0) * factor).toFixed(1)),
      carbs: Number(((selectedFood.carbs_g || 0) * factor).toFixed(1)),
      fat: Number(((selectedFood.fat_g || 0) * factor).toFixed(1)),
    }
  }, [selectedFood, quantity])

  const totals = useMemo(() => {
    return todayMeals.reduce(
      (acc, item) => {
        acc.calories += item.calories
        acc.protein += item.protein
        acc.carbs += item.carbs
        acc.fat += item.fat
        return acc
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }, [todayMeals])

  const totalWaterToday = useMemo(() => {
    return hydrationLogs.reduce((acc, log) => acc + Number(log.amount_ml || 0), 0)
  }, [hydrationLogs])

  const totalWorkoutExercisesToday = useMemo(() => {
    return todayWorkouts.length
  }, [todayWorkouts])

  const latestMetric = useMemo(() => {
    if (bodyMetrics.length === 0) return null
    return bodyMetrics[bodyMetrics.length - 1]
  }, [bodyMetrics])

  const metricChartData = useMemo(() => {
    return bodyMetrics.map((item) => ({
      date: item.metric_date,
      weight_kg: item.weight_kg,
      waist_cm: item.waist_cm,
      muscle_mass_kg: item.muscle_mass_kg,
    }))
  }, [bodyMetrics])

  const handleAddMeal = async () => {
    setMessage(null)
    setError(null)

    if (!selectedProfileId) {
      setError('Selectează un profil.')
      return
    }

    if (!selectedFoodId) {
      setError('Selectează un aliment.')
      return
    }

    if (!quantity || quantity <= 0) {
      setError('Cantitatea trebuie să fie mai mare decât 0.')
      return
    }

    setSavingMeal(true)

    const { data: mealData, error: mealError } = await supabase
      .from('meals')
      .insert([
        {
          profile_id: selectedProfileId,
          meal_type: mealType,
          meal_date: today,
          notes: null,
        },
      ])
      .select()
      .single()

    if (mealError || !mealData) {
      setError(mealError?.message || 'Nu am putut crea masa.')
      setSavingMeal(false)
      return
    }

    const { error: mealItemError } = await supabase
      .from('meal_items')
      .insert([
        {
          meal_id: mealData.id,
          food_id: selectedFoodId,
          quantity_g: quantity,
        },
      ])

    if (mealItemError) {
      setError(mealItemError.message)
      setSavingMeal(false)
      return
    }

    await loadTodayMeals(selectedProfileId, foods)
    setMessage('Masa a fost salvată cu succes.')
    setSavingMeal(false)
  }

  const handleAddWater = async (customAmount?: number) => {
    setMessage(null)
    setError(null)

    if (!selectedProfileId) {
      setError('Selectează un profil.')
      return
    }

    const amountToSave = customAmount ?? waterMl

    if (!amountToSave || amountToSave <= 0) {
      setError('Cantitatea de apă trebuie să fie mai mare decât 0.')
      return
    }

    setSavingWater(true)

    const { error } = await supabase
      .from('hydration_logs')
      .insert([
        {
          profile_id: selectedProfileId,
          log_date: today,
          amount_ml: amountToSave,
        },
      ])

    if (error) {
      setError(error.message)
      setSavingWater(false)
      return
    }

    await loadHydrationLogs(selectedProfileId)
    setMessage(`Au fost salvați ${amountToSave} ml apă.`)
    setSavingWater(false)
  }

  const handleCreateWorkout = async () => {
    setMessage(null)
    setError(null)

    if (!selectedProfileId) {
      setError('Selectează un profil.')
      return
    }

    if (!workoutTitle.trim()) {
      setError('Scrie un titlu pentru workout.')
      return
    }

    setCreatingWorkout(true)

    const { data, error } = await supabase
      .from('workouts')
      .insert([
        {
          profile_id: selectedProfileId,
          workout_date: today,
          workout_type: workoutType,
          title: workoutTitle.trim(),
          duration_min: workoutDuration ? Number(workoutDuration) : null,
          notes: workoutNotes.trim() || null,
        },
      ])
      .select()
      .single()

    if (error || !data) {
      setError(error?.message || 'Nu am putut crea workoutul.')
      setCreatingWorkout(false)
      return
    }

    await loadTodayWorkouts(selectedProfileId)
    setActiveWorkoutId(data.id)
    setMessage('Workoutul a fost creat.')
    setCreatingWorkout(false)
  }

  const handleAddWorkoutExercise = async () => {
    setMessage(null)
    setError(null)

    if (!activeWorkoutId) {
      setError('Creează sau selectează un workout activ.')
      return
    }

    if (!selectedExerciseId) {
      setError('Selectează un exercițiu.')
      return
    }

    setSavingExercise(true)

    const { error } = await supabase
      .from('workout_exercises')
      .insert([
        {
          workout_id: activeWorkoutId,
          exercise_name: selectedExercise?.name || 'Exercise',
          exercise_library_id: selectedExerciseId,
          sets: Number(sets),
          reps: Number(reps),
          weight_kg: Number(weight),
        },
      ])

    if (error) {
      setError(error.message)
      setSavingExercise(false)
      return
    }

    await loadWorkoutExercises(activeWorkoutId)
    setMessage('Exercițiul a fost adăugat în workoutul activ.')
    setSavingExercise(false)
  }

  const handleAddExerciseToLibrary = async () => {
    setMessage(null)
    setError(null)

    if (!newExerciseName.trim()) {
      setError('Scrie numele exercițiului.')
      return
    }

    setSavingLibraryExercise(true)

    const { error } = await supabase
      .from('exercise_library')
      .insert([
        {
          name: newExerciseName.trim(),
          category: newExerciseCategory,
          muscle_group: newExerciseMuscle.trim() || null,
          equipment: newExerciseEquipment.trim() || null,
          is_active: true,
        },
      ])

    if (error) {
      setError(error.message)
      setSavingLibraryExercise(false)
      return
    }

    const refreshed = await loadExerciseLibrary()
    const created = refreshed.find(
      (ex) => ex.name.toLowerCase() === newExerciseName.trim().toLowerCase()
    )

    if (created) {
      setSelectedExerciseId(created.id)
    }

    setNewExerciseName('')
    setNewExerciseCategory('strength')
    setNewExerciseMuscle('')
    setNewExerciseEquipment('')
    setMessage('Exercițiul a fost adăugat în bibliotecă.')
    setSavingLibraryExercise(false)
  }

  const handleSaveMetric = async () => {
    setMessage(null)
    setError(null)

    if (!selectedProfileId) {
      setError('Selectează un profil.')
      return
    }

    if (!metricDate) {
      setError('Selectează data.')
      return
    }

    setSavingMetric(true)

    const { error } = await supabase
      .from('body_metrics')
      .insert([
        {
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
        },
      ])

    if (error) {
      setError(error.message)
      setSavingMetric(false)
      return
    }

    await loadBodyMetrics(selectedProfileId)
    setMessage('Body metrics au fost salvate.')
    setSavingMetric(false)
  }

  const TabButton = ({
    tab,
    label,
  }: {
    tab: TabKey
    label: string
  }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`rounded-xl px-4 py-2 border transition ${
        activeTab === tab
          ? 'border-white bg-white text-black'
          : 'border-white/20 text-white hover:border-white/50'
      }`}
    >
      {label}
    </button>
  )

  const Card = ({
    title,
    children,
  }: {
    title: string
    children: React.ReactNode
  }) => (
    <section className="border border-white/20 rounded-2xl p-5">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {children}
    </section>
  )

  if (loading) return <div className="p-6">Se încarcă...</div>
  if (error && !selectedProfile && !selectedFood) return <div className="p-6">Eroare: {error}</div>

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold">FitPersonal Pro</h1>
            <p className="text-sm text-gray-400 mt-2">
              Dashboard fitness pentru Sorin și Anca
            </p>
          </div>

          <div className="border border-white/20 rounded-2xl p-4">
            <label className="block text-sm mb-2">Selectează profilul</label>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <TabButton tab="dashboard" label="Dashboard" />
            <TabButton tab="nutrition" label="Nutriție" />
            <TabButton tab="hydration" label="Hidratare" />
            <TabButton tab="workout" label="Workout" />
            <TabButton tab="metrics" label="Body Metrics" />
            <TabButton tab="library" label="Bibliotecă exerciții" />
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {selectedProfile && (
                <Card title="Profil">
                  <div className="space-y-2">
                    <div><strong>Nume:</strong> {selectedProfile.full_name}</div>
                    <div><strong>Vârstă:</strong> {selectedProfile.age ?? '-'}</div>
                    <div><strong>Înălțime:</strong> {selectedProfile.height_cm ?? '-'} cm</div>
                    <div><strong>Greutate actuală:</strong> {selectedProfile.current_weight_kg ?? '-'} kg</div>
                    <div><strong>Țintă:</strong> {selectedProfile.goal_weight_kg ?? '-'} kg</div>
                    <div><strong>Obiectiv:</strong> {selectedProfile.goal_type ?? '-'}</div>
                  </div>
                </Card>
              )}

              <Card title="Target zilnic">
                {selectedTarget ? (
                  <div className="space-y-2">
                    <div><strong>Calorii:</strong> {selectedTarget.calories_kcal ?? '-'} kcal</div>
                    <div><strong>Proteină:</strong> {selectedTarget.protein_g ?? '-'} g</div>
                    <div><strong>Carbohidrați:</strong> {selectedTarget.carbs_g ?? '-'} g</div>
                    <div><strong>Grăsimi:</strong> {selectedTarget.fat_g ?? '-'} g</div>
                    <div><strong>Hidratare:</strong> {selectedTarget.water_ml ?? '-'} ml</div>
                  </div>
                ) : (
                  <div>Nu există target pentru acest profil.</div>
                )}
              </Card>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
              <Card title="Calorii azi">
                <div className="text-2xl font-bold">{totals.calories.toFixed(1)}</div>
                <div className="text-sm text-gray-400">
                  din {selectedTarget?.calories_kcal ?? '-'} kcal
                </div>
              </Card>

              <Card title="Proteină azi">
                <div className="text-2xl font-bold">{totals.protein.toFixed(1)} g</div>
                <div className="text-sm text-gray-400">
                  din {selectedTarget?.protein_g ?? '-'} g
                </div>
              </Card>

              <Card title="Apă azi">
                <div className="text-2xl font-bold">{totalWaterToday} ml</div>
                <div className="text-sm text-gray-400">
                  din {selectedTarget?.water_ml ?? '-'} ml
                </div>
              </Card>

              <Card title="Workouturi azi">
                <div className="text-2xl font-bold">{totalWorkoutExercisesToday}</div>
                <div className="text-sm text-gray-400">
                  workouturi înregistrate
                </div>
              </Card>

              <Card title="Greutate curentă">
                <div className="text-2xl font-bold">
                  {latestMetric?.weight_kg ?? selectedProfile?.current_weight_kg ?? '-'}
                </div>
                <div className="text-sm text-gray-400">
                  ultimul body metric
                </div>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card title="Ultimele mese azi">
                {todayMeals.length === 0 ? (
                  <div className="text-gray-400">Nu există mese salvate azi.</div>
                ) : (
                  <div className="space-y-3">
                    {todayMeals.slice(0, 5).map((item, index) => (
                      <div
                        key={`${item.meal_id}-${index}`}
                        className="border border-white/10 rounded-xl p-3"
                      >
                        <div><strong>{item.food_name}</strong></div>
                        <div className="text-sm text-gray-400">
                          {item.meal_type} • {item.quantity_g} g • {item.calories} kcal
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Workout activ">
                {!activeWorkout ? (
                  <div className="text-gray-400">Nu există workout activ.</div>
                ) : (
                  <div className="space-y-3">
                    <div><strong>{activeWorkout.title}</strong></div>
                    <div className="text-sm text-gray-400">
                      {activeWorkout.workout_type} • {activeWorkout.duration_min ?? '-'} min
                    </div>

                    {activeWorkoutExercises.length === 0 ? (
                      <div className="text-gray-400">Nu există exerciții încă.</div>
                    ) : (
                      <div className="space-y-2">
                        {activeWorkoutExercises.map((exercise) => (
                          <div
                            key={exercise.id}
                            className="border border-white/10 rounded-xl p-3"
                          >
                            <div><strong>{exercise.exercise_name}</strong></div>
                            <div className="text-sm text-gray-400">
                              {exercise.sets ?? '-'} seturi • {exercise.reps ?? '-'} reps • {exercise.weight_kg ?? '-'} kg
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'nutrition' && (
          <div className="grid xl:grid-cols-2 gap-4">
            <Card title="Adaugă masă">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Tip masă</label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as MealType)}
                    className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                  >
                    <option value="breakfast">Mic dejun</option>
                    <option value="lunch">Prânz</option>
                    <option value="dinner">Cină</option>
                    <option value="snack">Gustare</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Aliment</label>
                  <select
                    value={selectedFoodId}
                    onChange={(e) => setSelectedFoodId(e.target.value)}
                    className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                  >
                    {foods.map((food) => (
                      <option key={food.id} value={food.id}>
                        {food.name}{food.brand ? ` - ${food.brand}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Cantitate (g)</label>
                  <input
                    type="number"
                    value={quantityG}
                    onChange={(e) => setQuantityG(e.target.value)}
                    className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                    min="1"
                  />
                </div>

                <button
                  onClick={handleAddMeal}
                  disabled={savingMeal}
                  className="w-full rounded-xl px-4 py-3 border border-white/20 hover:bg-white hover:text-black transition disabled:opacity-50"
                >
                  {savingMeal ? 'Se salvează...' : 'Salvează masa'}
                </button>
              </div>
            </Card>

            <div className="space-y-4">
              <Card title="Preview valori">
                {selectedFood ? (
                  <div className="space-y-2">
                    <div><strong>Aliment:</strong> {selectedFood.name}</div>
                    <div><strong>Cantitate:</strong> {quantity || 0} g</div>
                    <div><strong>Calorii:</strong> {computedMacros.calories} kcal</div>
                    <div><strong>Proteină:</strong> {computedMacros.protein} g</div>
                    <div><strong>Carbohidrați:</strong> {computedMacros.carbs} g</div>
                    <div><strong>Grăsimi:</strong> {computedMacros.fat} g</div>
                  </div>
                ) : (
                  <div>Nu există aliment selectat.</div>
                )}
              </Card>

              <Card title="Mese azi">
                {todayMeals.length === 0 ? (
                  <div className="text-gray-400">Nu există mese salvate azi.</div>
                ) : (
                  <div className="space-y-3 max-h-[460px] overflow-auto pr-2">
                    {todayMeals.map((item, index) => (
                      <div
                        key={`${item.meal_id}-${index}`}
                        className="border border-white/10 rounded-xl p-3"
                      >
                        <div><strong>{item.food_name}</strong></div>
                        <div className="text-sm text-gray-400">
                          {item.meal_type} • {item.quantity_g} g • {item.calories} kcal
                        </div>
                        <div className="text-sm text-gray-300 mt-1">
                          P: {item.protein} g • C: {item.carbs} g • F: {item.fat} g
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'hydration' && (
          <div className="grid xl:grid-cols-2 gap-4">
            <Card title="Hidratare">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Cantitate apă (ml)</label>
                  <input
                    type="number"
                    value={waterAmount}
                    onChange={(e) => setWaterAmount(e.target.value)}
                    className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                    min="1"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleAddWater(250)}
                    disabled={savingWater}
                    className="rounded-xl px-4 py-3 border border-white/20 hover:bg-white hover:text-black transition disabled:opacity-50"
                  >
                    +250 ml
                  </button>
                  <button
                    onClick={() => handleAddWater(500)}
                    disabled={savingWater}
                    className="rounded-xl px-4 py-3 border border-white/20 hover:bg-white hover:text-black transition disabled:opacity-50"
                  >
                    +500 ml
                  </button>
                  <button
                    onClick={() => handleAddWater(750)}
                    disabled={savingWater}
                    className="rounded-xl px-4 py-3 border border-white/20 hover:bg-white hover:text-black transition disabled:opacity-50"
                  >
                    +750 ml
                  </button>
                </div>

                <button
                  onClick={() => handleAddWater()}
                  disabled={savingWater}
                  className="w-full rounded-xl px-4 py-3 border border-white/20 hover:bg-white hover:text-black transition disabled:opacity-50"
                >
                  {savingWater ? 'Se salvează...' : 'Salvează hidratarea'}
                </button>
              </div>
            </Card>

            <Card title="Apă azi">
              <div className="space-y-4">
                <div>
                  <strong>Total:</strong> {totalWaterToday} ml
                  {selectedTarget?.water_ml ? ` / ${selectedTarget.water_ml} ml` : ''}
                </div>

                {hydrationLogs.length === 0 ? (
                  <div className="text-gray-400">Nu există apă salvată azi.</div>
                ) : (
                  <div className="space-y-3 max-h-[460px] overflow-auto pr-2">
                    {hydrationLogs.map((log) => (
                      <div
                        key={log.id}
                        className="border border-white/10 rounded-xl p-3"
                      >
                        <div><strong>Apă:</strong> {log.amount_ml} ml</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'workout' && (
          <div className="space-y-4">
            <div className="grid xl:grid-cols-3 gap-4">
              <Card title="Creează workout">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">Titlu</label>
                    <input
                      type="text"
                      value={workoutTitle}
                      onChange={(e) => setWorkoutTitle(e.target.value)}
                      className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                      placeholder="Ex: Push Day"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Tip workout</label>
                    <select
                      value={workoutType}
                      onChange={(e) => setWorkoutType(e.target.value)}
                      className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                    >
                      <option value="gym">Gym</option>
                      <option value="home">Home</option>
                      <option value="pilates">Pilates</option>
                      <option value="cardio">Cardio</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Durată (minute)</label>
                    <input
                      type="number"
                      value={workoutDuration}
                      onChange={(e) => setWorkoutDuration(e.target.value)}
                      className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Notițe</label>
                    <textarea
                      value={workoutNotes}
                      onChange={(e) => setWorkoutNotes(e.target.value)}
                      className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                      rows={3}
                      placeholder="Ex: focus pe piept și umeri"
                    />
                  </div>

                  <button
                    onClick={handleCreateWorkout}
                    disabled={creatingWorkout}
                    className="w-full rounded-xl px-4 py-3 border border-white/20 hover:bg-white hover:text-black transition disabled:opacity-50"
                  >
                    {creatingWorkout ? 'Se creează...' : 'Creează workout'}
                  </button>
                </div>
              </Card>

              <Card title="Workout activ">
                {todayWorkouts.length === 0 ? (
                  <div className="text-gray-400">Nu există workouturi azi.</div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm mb-2">Selectează workout</label>
                      <select
                        value={activeWorkoutId}
                        onChange={(e) => setActiveWorkoutId(e.target.value)}
                        className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                      >
                        {todayWorkouts.map((workout) => (
                          <option key={workout.id} value={workout.id}>
                            {workout.title} ({workout.workout_type})
                          </option>
                        ))}
                      </select>
                    </div>

                    {activeWorkout && (
                      <div className="space-y-2 text-sm">
                        <div><strong>Titlu:</strong> {activeWorkout.title}</div>
                        <div><strong>Tip:</strong> {activeWorkout.workout_type}</div>
                        <div><strong>Durată:</strong> {activeWorkout.duration_min ?? '-'} min</div>
                        <div><strong>Notițe:</strong> {activeWorkout.notes || '-'}</div>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              <Card title="Workouturi azi">
                {todayWorkouts.length === 0 ? (
                  <div className="text-gray-400">Nimic salvat azi.</div>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-auto pr-2">
                    {todayWorkouts.map((workout) => (
                      <div
                        key={workout.id}
                        className={`border rounded-xl p-3 cursor-pointer ${
                          activeWorkoutId === workout.id
                            ? 'border-white'
                            : 'border-white/10'
                        }`}
                        onClick={() => setActiveWorkoutId(workout.id)}
                      >
                        <div><strong>{workout.title}</strong></div>
                        <div className="text-sm text-gray-400">
                          {workout.workout_type} • {workout.duration_min ?? '-'} min
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="grid xl:grid-cols-2 gap-4">
              <Card title="Adaugă exercițiu în workoutul activ">
                {!activeWorkoutId ? (
                  <div className="text-gray-400">
                    Creează mai întâi un workout și selectează-l.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm mb-2">Exercițiu</label>
                      <select
                        value={selectedExerciseId}
                        onChange={(e) => setSelectedExerciseId(e.target.value)}
                        className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                      >
                        {exerciseLibrary.map((exercise) => (
                          <option key={exercise.id} value={exercise.id}>
                            {exercise.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedExercise && (
                      <div className="text-sm text-gray-400 space-y-1">
                        <div><strong>Categorie:</strong> {selectedExercise.category || '-'}</div>
                        <div><strong>Grupă musculară:</strong> {selectedExercise.muscle_group || '-'}</div>
                        <div><strong>Echipament:</strong> {selectedExercise.equipment || '-'}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm mb-2">Seturi</label>
                        <input
                          type="number"
                          value={sets}
                          onChange={(e) => setSets(e.target.value)}
                          className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2">Repetări</label>
                        <input
                          type="number"
                          value={reps}
                          onChange={(e) => setReps(e.target.value)}
                          className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-2">Kg</label>
                        <input
                          type="number"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                          min="0"
                          step="0.5"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleAddWorkoutExercise}
                      disabled={savingExercise}
                      className="w-full rounded-xl px-4 py-3 border border-white/20 hover:bg-white hover:text-black transition disabled:opacity-50"
                    >
                      {savingExercise ? 'Se salvează...' : 'Adaugă exercițiul'}
                    </button>
                  </div>
                )}
              </Card>

              <Card title="Exercițiile workoutului activ">
                {!activeWorkoutId ? (
                  <div className="text-gray-400">Nu există workout activ selectat.</div>
                ) : activeWorkoutExercises.length === 0 ? (
                  <div className="text-gray-400">Nu există exerciții salvate încă.</div>
                ) : (
                  <div className="space-y-3 max-h-[460px] overflow-auto pr-2">
                    {activeWorkoutExercises.map((exercise) => (
                      <div
                        key={exercise.id}
                        className="border border-white/10 rounded-xl p-3"
                      >
                        <div><strong>{exercise.exercise_name}</strong></div>
                        <div className="text-sm text-gray-300">
                          {exercise.sets ?? '-'} seturi • {exercise.reps ?? '-'} reps • {exercise.weight_kg ?? '-'} kg
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="space-y-4">
            <div className="grid xl:grid-cols-2 gap-4">
              <Card title="Adaugă body metrics">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">Data</label>
                    <input
                      id="metricDate"
                      type="date"
                      defaultValue={getLocalDateString()}
                      className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                      lang="en-CA"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      type="number"
                      value={metricWeight}
                      onChange={(e) => setMetricWeight(e.target.value)}
                      placeholder="Greutate kg"
                      className="bg-black border border-white/20 rounded-xl px-3 py-2"
                    />
                    <input
                      type="number"
                      value={metricMuscleMass}
                      onChange={(e) => setMetricMuscleMass(e.target.value)}
                      placeholder="Masă musculară kg"
                      className="bg-black border border-white/20 rounded-xl px-3 py-2"
                    />
                    <input
                      type="number"
                      value={metricBodyFat}
                      onChange={(e) => setMetricBodyFat(e.target.value)}
                      placeholder="Grăsime corporală %"
                      className="bg-black border border-white/20 rounded-xl px-3 py-2"
                    />
                    <input
                      type="number"
                      value={metricWaist}
                      onChange={(e) => setMetricWaist(e.target.value)}
                      placeholder="Talie cm"
                      className="bg-black border border-white/20 rounded-xl px-3 py-2"
                    />
                    <input
                      type="number"
                      value={metricChest}
                      onChange={(e) => setMetricChest(e.target.value)}
                      placeholder="Piept cm"
                      className="bg-black border border-white/20 rounded-xl px-3 py-2"
                    />
                    <input
                      type="number"
                      value={metricHips}
                      onChange={(e) => setMetricHips(e.target.value)}
                      placeholder="Șolduri cm"
                      className="bg-black border border-white/20 rounded-xl px-3 py-2"
                    />
                    <input
                      type="number"
                      value={metricArm}
                      onChange={(e) => setMetricArm(e.target.value)}
                      placeholder="Braț cm"
                      className="bg-black border border-white/20 rounded-xl px-3 py-2"
                    />
                    <input
                      type="number"
                      value={metricThigh}
                      onChange={(e) => setMetricThigh(e.target.value)}
                      placeholder="Coapsă cm"
                      className="bg-black border border-white/20 rounded-xl px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Notițe</label>
                    <textarea
                      value={metricNotes}
                      onChange={(e) => setMetricNotes(e.target.value)}
                      className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                      rows={3}
                      placeholder="Ex: măsurat dimineața, pe stomacul gol"
                    />
                  </div>

                  <button
                    onClick={handleSaveMetric}
                    disabled={savingMetric}
                    className="w-full rounded-xl px-4 py-3 border border-white/20 hover:bg-white hover:text-black transition disabled:opacity-50"
                  >
                    {savingMetric ? 'Se salvează...' : 'Salvează body metrics'}
                  </button>
                </div>
              </Card>

              <Card title="Ultimele măsurători">
                {bodyMetrics.length === 0 ? (
                  <div className="text-gray-400">Nu există body metrics salvate.</div>
                ) : (
                  <div className="space-y-3 max-h-[560px] overflow-auto pr-2">
                    {[...bodyMetrics].reverse().map((metric) => (
                      <div
                        key={metric.id}
                        className="border border-white/10 rounded-xl p-3"
                      >
                        <div><strong>{metric.metric_date}</strong></div>
                        <div className="text-sm text-gray-300 mt-1">
                          Greutate: {metric.weight_kg ?? '-'} kg
                        </div>
                        <div className="text-sm text-gray-300">
                          Talie: {metric.waist_cm ?? '-'} cm
                        </div>
                        <div className="text-sm text-gray-300">
                          Masă musculară: {metric.muscle_mass_kg ?? '-'} kg
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {metric.notes || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="grid xl:grid-cols-3 gap-4">
              <Card title="Grafic greutate">
                {metricChartData.length === 0 ? (
                  <div className="text-gray-400">Nu există date pentru grafic.</div>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metricChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="weight_kg" stroke="#ffffff" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              <Card title="Grafic talie">
                {metricChartData.length === 0 ? (
                  <div className="text-gray-400">Nu există date pentru grafic.</div>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metricChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="waist_cm" stroke="#ffffff" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              <Card title="Grafic masă musculară">
                {metricChartData.length === 0 ? (
                  <div className="text-gray-400">Nu există date pentru grafic.</div>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metricChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="muscle_mass_kg" stroke="#ffffff" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'library' && (
          <div className="grid xl:grid-cols-2 gap-4">
            <Card title="Adaugă exercițiu nou în bibliotecă">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Nume exercițiu</label>
                  <input
                    type="text"
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                    className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                    placeholder="Ex: Chest Supported Row"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Categorie</label>
                  <select
                    value={newExerciseCategory}
                    onChange={(e) => setNewExerciseCategory(e.target.value)}
                    className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                  >
                    <option value="strength">Strength</option>
                    <option value="cardio">Cardio</option>
                    <option value="mobility">Mobility</option>
                    <option value="pilates">Pilates</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Grupă musculară</label>
                  <input
                    type="text"
                    value={newExerciseMuscle}
                    onChange={(e) => setNewExerciseMuscle(e.target.value)}
                    className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                    placeholder="Ex: back"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Echipament</label>
                  <input
                    type="text"
                    value={newExerciseEquipment}
                    onChange={(e) => setNewExerciseEquipment(e.target.value)}
                    className="bg-black border border-white/20 rounded-xl px-3 py-2 w-full"
                    placeholder="Ex: machine"
                  />
                </div>

                <button
                  onClick={handleAddExerciseToLibrary}
                  disabled={savingLibraryExercise}
                  className="w-full rounded-xl px-4 py-3 border border-white/20 hover:bg-white hover:text-black transition disabled:opacity-50"
                >
                  {savingLibraryExercise ? 'Se salvează...' : 'Adaugă în bibliotecă'}
                </button>
              </div>
            </Card>

            <Card title="Bibliotecă exerciții">
              {exerciseLibrary.length === 0 ? (
                <div className="text-gray-400">Nu există exerciții în bibliotecă.</div>
              ) : (
                <div className="space-y-3 max-h-[640px] overflow-auto pr-2">
                  {exerciseLibrary.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="border border-white/10 rounded-xl p-3"
                    >
                      <div><strong>{exercise.name}</strong></div>
                      <div className="text-sm text-gray-400">
                        {exercise.category || '-'} • {exercise.muscle_group || '-'} • {exercise.equipment || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {message && (
          <div className="text-green-400 text-sm">{message}</div>
        )}

        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}
      </div>
    </main>
  )
}