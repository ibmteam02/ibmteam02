import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const pageStyle = {
  padding: '24px',
  maxWidth: '520px',
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  marginBottom: '12px',
  boxSizing: 'border-box',
}

const buttonStyle = {
  padding: '10px 16px',
  border: '1px solid #222',
  background: '#fff',
  cursor: 'pointer',
}

const primaryButtonStyle = {
  ...buttonStyle,
  width: '100%',
  background: '#111',
  color: '#fff',
}

function Signup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [message, setMessage] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('MALE')
  const [role, setRole] = useState('USER')

  const [verificationCode, setVerificationCode] = useState('')
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  const [allergies, setAllergies] = useState('')
  const [diseases, setDiseases] = useState('')

  const [docNumber, setDocNumber] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseImage, setLicenseImage] = useState(null)

  useEffect(() => {
    if (timeLeft <= 0) return undefined

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const getErrorMessage = (error, fallback) => {
    const payload = error?.response?.data
    if (typeof payload === 'string') return payload
    if (payload?.message) return payload.message
    return fallback
  }

  const handleSendVerificationCode = async () => {
    if (!email) {
      setMessage('이메일을 먼저 입력해주세요.')
      return
    }

    try {
      const response = await api.post('/auth/email/verification-code', {
        email,
      })

      setIsCodeSent(true)
      setTimeLeft(response.data?.expiresInSeconds ?? 180)
      setMessage(response.data?.message ?? '인증번호를 전송했습니다.')
    } catch (error) {
      setMessage(getErrorMessage(error, '인증번호 전송에 실패했습니다.'))
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setMessage('인증번호를 입력해주세요.')
      return
    }

    try {
      const response = await api.post('/auth/email/verify', {
        email,
        code: verificationCode,
      })

      if (response.data?.verified) {
        setIsEmailVerified(true)
        setTimeLeft(0)
      }

      setMessage(response.data?.message ?? '이메일 인증 결과를 확인해주세요.')
    } catch (error) {
      setMessage(getErrorMessage(error, '인증번호 확인에 실패했습니다.'))
    }
  }

  const handleStep1Submit = async (event) => {
    event.preventDefault()

    if (!isEmailVerified) {
      setMessage('이메일 인증을 완료해야 다음 단계로 이동할 수 있습니다.')
      return
    }

    try {
      await api.post('/auth/signup', {
        email,
        password,
        username,
        birthDate,
        gender,
        role,
      })

      localStorage.setItem('signupEmail', email)
      setMessage('')
      setStep(2)
    } catch (error) {
      setMessage(getErrorMessage(error, '회원가입 1단계 처리에 실패했습니다.'))
    }
  }

  const handleUserStep2Submit = async (event) => {
    event.preventDefault()

    try {
      await api.post('/auth/user/profile', {
        email: localStorage.getItem('signupEmail'),
        allergies,
        diseases,
      })

      localStorage.removeItem('signupEmail')
      alert('일반 사용자 추가 정보 등록이 완료되었습니다.')
      navigate('/login')
    } catch (error) {
      setMessage(
        getErrorMessage(
          error,
          '현재 backend-auth에는 일반 사용자 2단계 API가 연결되어 있지 않거나 요청 형식이 맞지 않습니다.',
        ),
      )
    }
  }

  const handlePharmacistStep2Submit = async (event) => {
    event.preventDefault()

    if (!licenseImage) {
      setMessage('면허 이미지를 선택해주세요.')
      return
    }

    const formData = new FormData()
    const requestData = {
      email: localStorage.getItem('signupEmail'),
      docNumber,
      licenseNumber,
    }

    formData.append('data', new Blob([JSON.stringify(requestData)], { type: 'application/json' }))
    formData.append('licenseImage', licenseImage)

    try {
      await api.post('/auth/pharmacists/verification', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      localStorage.removeItem('signupEmail')
      alert('약사 면허 인증 요청이 완료되었습니다.')
      navigate('/login')
    } catch (error) {
      setMessage(getErrorMessage(error, '약사 추가 정보 등록에 실패했습니다.'))
    }
  }

  if (step === 1) {
    return (
      <div style={pageStyle}>
        <h2>회원가입 1단계</h2>
        <form onSubmit={handleStep1Submit}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={{ ...inputStyle, marginBottom: 0 }}
              disabled={isEmailVerified}
              required
            />
            <button type="button" style={buttonStyle} onClick={handleSendVerificationCode} disabled={isEmailVerified}>
              {isCodeSent ? '재전송' : '인증번호 발송'}
            </button>
          </div>

          {isCodeSent && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="인증번호"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                style={{ ...inputStyle, marginBottom: 0 }}
                disabled={isEmailVerified}
              />
              <button type="button" style={buttonStyle} onClick={handleVerifyCode} disabled={isEmailVerified}>
                {isEmailVerified ? '인증 완료' : '인증 확인'}
              </button>
              {timeLeft > 0 && <span>{formatTime(timeLeft)}</span>}
            </div>
          )}

          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="text"
            placeholder="이름"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            style={inputStyle}
            required
          />

          <div style={{ marginBottom: '12px' }}>
            <strong>성별</strong>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button type="button" style={buttonStyle} onClick={() => setGender('MALE')}>
                남성 {gender === 'MALE' ? '(선택됨)' : ''}
              </button>
              <button type="button" style={buttonStyle} onClick={() => setGender('FEMALE')}>
                여성 {gender === 'FEMALE' ? '(선택됨)' : ''}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong>역할</strong>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button type="button" style={buttonStyle} onClick={() => setRole('USER')}>
                일반 사용자 {role === 'USER' ? '(선택됨)' : ''}
              </button>
              <button type="button" style={buttonStyle} onClick={() => setRole('PHARMACIST')}>
                약사 {role === 'PHARMACIST' ? '(선택됨)' : ''}
              </button>
            </div>
          </div>

          <button type="submit" style={primaryButtonStyle}>
            다음 단계로 이동
          </button>
        </form>

        {message && <p style={{ marginTop: '16px', color: '#b00020' }}>{message}</p>}
      </div>
    )
  }

  if (step === 2 && role === 'USER') {
    return (
      <div style={pageStyle}>
        <h2>회원가입 2단계 - 일반 사용자</h2>
        <form onSubmit={handleUserStep2Submit}>
          <input
            type="text"
            placeholder="알레르기"
            value={allergies}
            onChange={(event) => setAllergies(event.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="질병"
            value={diseases}
            onChange={(event) => setDiseases(event.target.value)}
            style={inputStyle}
          />
          <button type="submit" style={primaryButtonStyle}>
            일반 사용자 추가 정보 제출
          </button>
        </form>

        <p style={{ marginTop: '16px', color: '#555' }}>
          현재 backend-auth 코드 기준으로는 일반 사용자 2단계 컨트롤러가 보이지 않아서, 이 단계는 실패하면 백엔드 미구현으로 봐야 합니다.
        </p>
        {message && <p style={{ marginTop: '12px', color: '#b00020' }}>{message}</p>}
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <h2>회원가입 2단계 - 약사</h2>
      <form onSubmit={handlePharmacistStep2Submit}>
        <input
          type="text"
          placeholder="문서 번호"
          value={docNumber}
          onChange={(event) => setDocNumber(event.target.value)}
          style={inputStyle}
          required
        />
        <input
          type="text"
          placeholder="면허 번호"
          value={licenseNumber}
          onChange={(event) => setLicenseNumber(event.target.value)}
          style={inputStyle}
          required
        />
        <input
          type="file"
          accept="image/*"
          onChange={(event) => setLicenseImage(event.target.files?.[0] ?? null)}
          style={inputStyle}
          required
        />
        <button type="submit" style={primaryButtonStyle}>
          약사 인증 요청
        </button>
      </form>

      {message && <p style={{ marginTop: '16px', color: '#b00020' }}>{message}</p>}
    </div>
  )
}

export default Signup
