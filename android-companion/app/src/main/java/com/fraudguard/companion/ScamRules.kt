package com.fraudguard.companion
data class ScamResult(val score:Int,val reasons:List<String>)
object ScamRules {
 private data class Rule(val score:Int,val reason:String,val pattern:Regex)
 private val rules=listOf(
  Rule(35,"Requests an OTP, PIN, password or verification code",Regex("(otp|verification code|password|pin).{0,55}(send|share|tell|confirm|give)|(send|share|tell|give).{0,45}(otp|verification code|password|pin)",RegexOption.IGNORE_CASE)),
  Rule(30,"Urgent money transfer or payment pressure",Regex("(send|transfer|pay|deposit).{0,60}(money|cash|funds|fee|payment).{0,60}(urgent|now|immediately|today)",RegexOption.IGNORE_CASE)),
  Rule(28,"Gift card or voucher payment request",Regex("(gift card|itunes|google play card|steam card|voucher)",RegexOption.IGNORE_CASE)),
  Rule(28,"Crypto payment or wallet secret request",Regex("(seed phrase|recovery phrase|private key|bitcoin|usdt|crypto wallet)",RegexOption.IGNORE_CASE)),
  Rule(25,"Possible fake bank or support identity",Regex("(bank support|security team|customer support|admin).{0,70}(code|pin|password|transfer|payment)",RegexOption.IGNORE_CASE)),
  Rule(22,"Possible upfront job, parcel or investment fee",Regex("(registration fee|processing fee|clearance fee|unlock fee|guaranteed returns|double your money)",RegexOption.IGNORE_CASE)),
  Rule(18,"Pressure to keep the request secret",Regex("(don't tell anyone|do not tell anyone|keep this secret|between us)",RegexOption.IGNORE_CASE))
 )
 fun inspect(message:String):ScamResult { val m=rules.filter{it.pattern.containsMatchIn(message)}; return ScamResult(m.sumOf{it.score}.coerceAtMost(100),m.map{it.reason}) }
}
