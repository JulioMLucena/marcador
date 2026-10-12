package expo.modules.livereading

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Botão Pausar/Continuar da notificação: funciona sem abrir o app. */
class LiveReadingReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == LiveReading.ACTION_TOGGLE) LiveReading.toggle(context)
  }
}
