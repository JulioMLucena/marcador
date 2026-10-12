package expo.modules.livereading

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * Notificação fixa da leitura em andamento: livro, cronômetro correndo e botões Pausar e Terminei.
 * O estado fica em SharedPreferences para o botão Pausar funcionar com o app fechado;
 * o app lê esse estado de volta (getState) e acerta o próprio cronômetro.
 */
object LiveReading {
  private const val PREFS = "marcador.leitura"
  private const val CHANNEL = "leitura-ao-vivo"
  private const val ID = 4242
  const val ACTION_TOGGLE = "expo.modules.livereading.TOGGLE"

  private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun save(ctx: Context, o: ShowOptions) {
    prefs(ctx).edit()
      .putBoolean("active", true)
      .putString("title", o.title)
      .putString("text", o.text)
      .putLong("start", o.start.toLong())
      .putLong("pausedMs", o.pausedMs.toLong())
      .putLong("pausedAt", o.pausedAt?.toLong() ?: -1L)
      .putInt("page", o.page)
      .putInt("pages", o.pages)
      .putString("openUrl", o.openUrl)
      .putString("finishUrl", o.finishUrl)
      .apply()
  }

  fun state(ctx: Context): Map<String, Any?>? {
    val p = prefs(ctx)
    if (!p.getBoolean("active", false)) return null
    val pausedAt = p.getLong("pausedAt", -1L)
    return mapOf(
      "start" to p.getLong("start", 0L).toDouble(),
      "pausedMs" to p.getLong("pausedMs", 0L).toDouble(),
      "pausedAt" to if (pausedAt < 0) null else pausedAt.toDouble(),
    )
  }

  fun toggle(ctx: Context) {
    val p = prefs(ctx)
    if (!p.getBoolean("active", false)) return
    val now = System.currentTimeMillis()
    val pausedAt = p.getLong("pausedAt", -1L)
    val e = p.edit()
    if (pausedAt >= 0) {
      e.putLong("pausedMs", p.getLong("pausedMs", 0L) + now - pausedAt).putLong("pausedAt", -1L)
    } else {
      e.putLong("pausedAt", now)
    }
    e.commit()
    post(ctx)
  }

  fun clear(ctx: Context) {
    prefs(ctx).edit().clear().apply()
    NotificationManagerCompat.from(ctx).cancel(ID)
  }

  private fun fmt(ms: Long): String {
    val s = ms / 1000
    val h = s / 3600
    val m = (s % 3600) / 60
    val sec = s % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, sec) else "%02d:%02d".format(m, sec)
  }

  private fun smallIcon(ctx: Context): Int {
    val res = ctx.resources.getIdentifier("notification_icon", "drawable", ctx.packageName)
    return if (res != 0) res else ctx.applicationInfo.icon
  }

  private fun openIntent(ctx: Context, url: String?, code: Int): PendingIntent? {
    val intent = if (url.isNullOrEmpty()) {
      ctx.packageManager.getLaunchIntentForPackage(ctx.packageName) ?: return null
    } else {
      Intent(Intent.ACTION_VIEW, Uri.parse(url)).setPackage(ctx.packageName)
    }
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(ctx, code, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  @SuppressLint("MissingPermission")
  fun post(ctx: Context) {
    val p = prefs(ctx)
    if (!p.getBoolean("active", false)) return
    val nm = NotificationManagerCompat.from(ctx)
    if (!nm.areNotificationsEnabled()) return
    nm.createNotificationChannel(
      NotificationChannelCompat.Builder(CHANNEL, NotificationManagerCompat.IMPORTANCE_DEFAULT)
        .setName("Leitura em andamento")
        .setDescription("Cronômetro da leitura, com pausar e terminar")
        .setSound(null, null)
        .setVibrationEnabled(false)
        .setShowBadge(false)
        .build()
    )

    val now = System.currentTimeMillis()
    val start = p.getLong("start", now)
    val pausedMs = p.getLong("pausedMs", 0L)
    val pausedAt = p.getLong("pausedAt", -1L)
    val paused = pausedAt >= 0
    val elapsed = maxOf(0L, (if (paused) pausedAt else now) - start - pausedMs)
    val text = p.getString("text", "") ?: ""
    val page = p.getInt("page", 0)
    val pages = p.getInt("pages", 0)

    val toggle = PendingIntent.getBroadcast(
      ctx, 3,
      Intent(ctx, LiveReadingReceiver::class.java).setAction(ACTION_TOGGLE),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val b = NotificationCompat.Builder(ctx, CHANNEL)
      .setSmallIcon(smallIcon(ctx))
      .setContentTitle(p.getString("title", "Lendo") ?: "Lendo")
      .setContentText(if (paused) "Pausado em ${fmt(elapsed)} · $text" else text)
      .setSubText(if (paused) "Pausado" else "Lendo")
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory("stopwatch")
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setContentIntent(openIntent(ctx, p.getString("openUrl", null), 1))
      .addAction(0, if (paused) "Continuar" else "Pausar", toggle)
      .addAction(0, "Terminei", openIntent(ctx, p.getString("finishUrl", null), 2))
      .addExtras(Bundle().apply {
        // Android 16 (Live Updates): pede para virar atualização ao vivo, como placar e cronômetro
        putBoolean("android.requestPromotedOngoing", true)
        if (paused) putString("android.shortCriticalText", "Pausado")
      })

    if (paused) {
      b.setShowWhen(false)
    } else {
      b.setUsesChronometer(true).setShowWhen(true).setWhen(now - elapsed)
    }
    if (pages > 0) b.setProgress(pages, page.coerceIn(0, pages), false)

    try {
      nm.notify(ID, b.build())
    } catch (e: SecurityException) {
    }
  }
}
