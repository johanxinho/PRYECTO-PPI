import { useEffect, useState } from 'react'
import './App.css'

const initialLanguageState = {
  JavaScript: false,
  Python: false,
  Java: false,
  'C#': false,
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function App() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [age, setAge] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [experience, setExperience] = useState(5)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [languages, setLanguages] = useState(initialLanguageState)
  const [modality, setModality] = useState('Presencial')
  const [country, setCountry] = useState('Colombia')
  const [comments, setComments] = useState('')
  const [color, setColor] = useState('#7c3aed')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [errors, setErrors] = useState({ email: '', age: '' })
  const [submittedData, setSubmittedData] = useState(null)

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [photoPreview])

  const handleEmailChange = (event) => {
    const value = event.target.value
    setEmail(value)

    if (value && !emailPattern.test(value)) {
      setErrors((prev) => ({ ...prev, email: 'Correo inválido' }))
    } else {
      setErrors((prev) => ({ ...prev, email: '' }))
    }
  }

  const handleAgeChange = (event) => {
    const value = event.target.value
    setAge(value)

    if (value && Number(value) <= 0) {
      setErrors((prev) => ({ ...prev, age: 'La edad debe ser mayor que cero' }))
    } else {
      setErrors((prev) => ({ ...prev, age: '' }))
    }
  }

  const handleLanguageChange = (event) => {
    const { name, checked } = event.target
    setLanguages((prev) => ({ ...prev, [name]: checked }))
  }

  const handlePhotoChange = (event) => {
    const selectedFile = event.target.files?.[0] || null
    setPhotoFile(selectedFile)

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
      setPhotoPreview(null)
    }

    if (selectedFile) {
      setPhotoPreview(URL.createObjectURL(selectedFile))
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const currentErrors = {
      email: !email
        ? 'Correo es obligatorio'
        : !emailPattern.test(email)
        ? 'Correo inválido'
        : '',
      age: !age
        ? 'La edad es obligatoria'
        : Number(age) <= 0
        ? 'La edad debe ser mayor que cero'
        : '',
    }

    setErrors(currentErrors)

    const hasError = Boolean(currentErrors.email || currentErrors.age)
    if (hasError || !acceptTerms) {
      return
    }

    const selectedLanguages = Object.keys(languages).filter(
      (language) => languages[language],
    )

    setSubmittedData({
      name,
      email,
      password,
      age,
      birthdate,
      experience,
      acceptTerms,
      selectedLanguages,
      modality,
      country,
      comments,
      color,
      photoName: photoFile?.name || 'No se seleccionó archivo',
      photoPreview,
    })
  }

  return (
    <div className="app-shell">
      <main className="form-card">
        <header className="form-header">
          <h1>Registro de estudiante</h1>
          <p>Completa el formulario para crear tu perfil de estudiante.</p>
        </header>

        <form className="student-form" onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              required
            />
            {errors.email && <p className="error-message">{errors.email}</p>}
          </div>

          <div className="field-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <div className="field-row">
            <div className="field-group">
              <label htmlFor="age">Edad</label>
              <input
                id="age"
                type="number"
                value={age}
                onChange={handleAgeChange}
                min="1"
                required
              />
              {errors.age && <p className="error-message">{errors.age}</p>}
            </div>

            <div className="field-group">
              <label htmlFor="birthdate">Fecha de nacimiento</label>
              <input
                id="birthdate"
                type="date"
                value={birthdate}
                onChange={(event) => setBirthdate(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="experience">Nivel de experiencia</label>
            <div className="range-row">
              <input
                id="experience"
                type="range"
                min="1"
                max="10"
                value={experience}
                onChange={(event) => setExperience(Number(event.target.value))}
              />
              <span className="range-value">{experience}</span>
            </div>
          </div>

          <fieldset className="fieldset">
            <legend>Lenguajes conocidos</legend>
            {Object.keys(languages).map((language) => (
              <label className="checkbox-label" key={language}>
                <input
                  type="checkbox"
                  name={language}
                  checked={languages[language]}
                  onChange={handleLanguageChange}
                />
                {language}
              </label>
            ))}
          </fieldset>

          <fieldset className="fieldset">
            <legend>Modalidad</legend>
            {['Presencial', 'Virtual'].map((option) => (
              <label className="radio-label" key={option}>
                <input
                  type="radio"
                  name="modality"
                  value={option}
                  checked={modality === option}
                  onChange={(event) => setModality(event.target.value)}
                />
                {option}
              </label>
            ))}
          </fieldset>

          <div className="field-group">
            <label htmlFor="country">País</label>
            <select
              id="country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              <option>Colombia</option>
              <option>México</option>
              <option>Argentina</option>
              <option>Perú</option>
              <option>Chile</option>
              <option>España</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="comments">Comentarios</label>
            <textarea
              id="comments"
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              rows="4"
              placeholder="Escribe tus observaciones..."
            />
          </div>

          <div className="field-row">
            <div className="field-group">
              <label htmlFor="photo">Foto de perfil</label>
              <input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </div>

            <div className="field-group">
              <label htmlFor="color">Color favorito</label>
              <input
                id="color"
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
              />
            </div>
          </div>

          {photoPreview && (
            <div className="image-preview">
              <p>Vista previa de imagen</p>
              <img src={photoPreview} alt="Vista previa de perfil" />
            </div>
          )}

          <label className="checkbox-label terms-label">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
            />
            Aceptar términos
          </label>

          <button className="submit-button" type="submit" disabled={!acceptTerms}>
            Enviar
          </button>
        </form>

        {submittedData && (
          <section className="form-summary">
            <h2>Resumen de registro</h2>
            <div className="summary-grid">
              <p>
                <strong>Nombre:</strong> {submittedData.name}
              </p>
              <p>
                <strong>Correo:</strong> {submittedData.email}
              </p>
              <p>
                <strong>Contraseña:</strong> {submittedData.password}
              </p>
              <p>
                <strong>Edad:</strong> {submittedData.age}
              </p>
              <p>
                <strong>Fecha de nacimiento:</strong> {submittedData.birthdate}
              </p>
              <p>
                <strong>Experiencia:</strong> {submittedData.experience}
              </p>
              <p>
                <strong>Términos aceptados:</strong>{' '}
                {submittedData.acceptTerms ? 'Sí' : 'No'}
              </p>
              <p>
                <strong>Lenguajes:</strong>{' '}
                {submittedData.selectedLanguages.length > 0
                  ? submittedData.selectedLanguages.join(', ')
                  : 'Ninguno'}
              </p>
              <p>
                <strong>Modalidad:</strong> {submittedData.modality}
              </p>
              <p>
                <strong>País:</strong> {submittedData.country}
              </p>
              <p>
                <strong>Comentarios:</strong> {submittedData.comments || 'Sin comentarios'}
              </p>
              <p>
                <strong>Color favorito:</strong>{' '}
                <span className="color-chip" style={{ background: submittedData.color }} />
              </p>
              <p>
                <strong>Nombre del archivo:</strong> {submittedData.photoName}
              </p>
            </div>

            {submittedData.photoPreview && (
              <div className="summary-image">
                <img src={submittedData.photoPreview} alt="Foto registrada" />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default App
