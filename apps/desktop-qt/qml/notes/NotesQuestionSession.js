.pragma library

function loadQuestions(controller, batteryId, questionId) {
    if (controller && batteryId && typeof controller.getBatteryQuestions === "function") {
        return controller.getBatteryQuestions(batteryId) || []
    }
    if (controller && questionId && typeof controller.getQuizQuestion === "function") {
        var question = controller.getQuizQuestion(questionId)
        return question && question.id ? [question] : []
    }
    return []
}
