export function logError(context: string, error: any) {
  console.error(`Error in ${context}:`)
  
  if (error && typeof error === 'object') {
    // Supabaseエラーの場合
    if (error.message) console.error('Message:', error.message)
    if (error.details) console.error('Details:', error.details)
    if (error.hint) console.error('Hint:', error.hint)
    if (error.code) console.error('Code:', error.code)
    
    // その他のプロパティ
    const keys = Object.keys(error)
    if (keys.length > 0) {
      console.error('Error object keys:', keys)
      keys.forEach(key => {
        if (!['message', 'details', 'hint', 'code'].includes(key)) {
          console.error(`${key}:`, error[key])
        }
      })
    }
  } else {
    console.error('Raw error:', error)
  }
  
  // スタックトレース
  if (error?.stack) {
    console.error('Stack:', error.stack)
  }
}