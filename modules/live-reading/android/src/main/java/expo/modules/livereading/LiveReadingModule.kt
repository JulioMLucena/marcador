package expo.modules.livereading

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class ShowOptions : Record {
  @Field val title: String = ""
  @Field val text: String = ""
  @Field val start: Double = 0.0
  @Field val pausedMs: Double = 0.0
  @Field val pausedAt: Double? = null
  @Field val page: Int = 0
  @Field val pages: Int = 0
  @Field val openUrl: String? = null
  @Field val finishUrl: String? = null
}

class LiveReadingModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("LiveReading")

    Function("show") { o: ShowOptions ->
      LiveReading.save(context, o)
      LiveReading.post(context)
    }

    Function("hide") {
      LiveReading.clear(context)
    }

    Function("getState") {
      LiveReading.state(context)
    }
  }
}
