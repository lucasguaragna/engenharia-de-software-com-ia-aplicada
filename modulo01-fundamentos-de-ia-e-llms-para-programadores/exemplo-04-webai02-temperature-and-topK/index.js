
const aiContext = {
    session: null,
    abortController: null,
    isGenerating: false,
};

const elements = {
    temperature: document.getElementById('temperature'),
    temperatureValue: document.getElementById('temp-value'),
    topKValue: document.getElementById('topk-value'),
    topK: document.getElementById('topK'),
    form: document.getElementById('question-form'),
    questionInput: document.getElementById('question'),
    output: document.getElementById('output'),
    button: document.getElementById('ask-button'),
    year: document.getElementById('year'),
}

async function setupEventListeners() {

    // Update display values for range inputs
    elements.temperature.addEventListener('input', (e) => {
        elements.temperatureValue.textContent = e.target.value;
    });

    elements.topK.addEventListener('input', (e) => {
        elements.topKValue.textContent = e.target.value;
    });

    elements.form.addEventListener('submit', async function (event) {
        event.preventDefault();

        if (aiContext.isGenerating) {
            toggleSendOrStopButton(false)
            return;
        }

        onSubmitQuestion();
    });
}

async function onSubmitQuestion() {
    const questionInput = elements.questionInput;
    const output = elements.output;
    const question = questionInput.value;

    if (!question.trim()) {
        return;
    }

    // Get parameters from form
    const temperature = parseFloat(elements.temperature.value);
    const topK = parseInt(elements.topK.value);
    console.log('Using parameters:', { temperature, topK });

    // Change button to stop mode
    toggleSendOrStopButton(true)

    output.textContent = 'Processing your question...';
    const aiResponseChunks = await askAI(question, temperature, topK);
    output.textContent = '';

    for await (const chunk of aiResponseChunks) {
        if (aiContext.abortController.signal.aborted) {
            break;
        }
        console.log('Received chunk:', chunk);
        output.textContent += chunk;
    }

   toggleSendOrStopButton(false);
}

function toggleSendOrStopButton(isGenerating) {
    if (isGenerating) {
        // Switch to stop mode
        aiContext.isGenerating = isGenerating;
        elements.button.textContent = 'Parar';
        elements.button.classList.add('stop-button');
    } else {
        // Switch to send mode
        aiContext.abortController?.abort();
        aiContext.isGenerating = isGenerating;
        elements.button.textContent = 'Enviar';
        elements.button.classList.remove('stop-button');
    }
}
async function* askAI(question, temperature, topK) {
    aiContext.abortController?.abort();
    aiContext.abortController = new AbortController();

    // Destroy previous session and create new one with updated parameters
    if (aiContext.session) {
        aiContext.session.destroy();
    }

    const options = {
        expectedInputLanguages: ["pt"],
        temperature: temperature,
        initialPrompts: [
            {
                role: 'system', content: `
                Você é um assistente de IA que responde de forma clara e objetiva.
                Responda sempre em formato de texto ao invés de markdown`

            },
        ],
    };

    if (topK > 0 && typeof topK === 'number') {
        options.topK = topK;
    }

    const session = await LanguageModel.create(options);

    const responseStream = await session.promptStreaming(
        [
            {
                role: 'user',
                content: question,
            },
        ],
        {
            signal: aiContext.abortController.signal,
        }
    );

    for await (const chunk of responseStream) {
        if (aiContext.abortController.signal.aborted) {
            break;
        }
        yield chunk;
    }
}

async function checkRequirements() {
    const errors = [];
    const returnResults = () => errors.length ? errors : null;

    // @ts-ignore
    const isChrome = !!window.chrome;
    if (!isChrome)
        errors.push("⚠️ Este recurso só funciona no Google Chrome ou Chrome Canary (versão recente).");
    if (typeof window.LanguageModel === 'undefined' && typeof LanguageModel === 'undefined') {
        errors.push("⚠️ As APIs nativas de IA não estão ativas.");
        errors.push("Ative a seguinte flag em chrome://flags/:");
        errors.push("- Prompt API for Gemini Nano (chrome://flags/#prompt-api-for-gemini-nano)");
        errors.push("Depois reinicie o Chrome e tente novamente.");
        return returnResults();
    }

    const availability = await LanguageModel.availability({ languages: ["pt"] });
    console.log('Language Model Availability:', availability);
    if (availability === 'available') {
        return returnResults();
    }

    if (availability === 'unavailable') {
        errors.push(`⚠️ O seu dispositivo não suporta modelos de linguagem nativos de IA.`);
    }

    if (availability === 'downloading') {
        errors.push(`⚠️ O modelo de linguagem de IA está sendo baixado. Por favor, aguarde alguns minutos e tente novamente.`);
    }

    if (availability === 'downloadable') {
        errors.push(`⚠️ O modelo de linguagem de IA precisa ser baixado.`);
        errors.push(`<button id="btn-download" style="padding: 10px; margin-top: 10px; cursor: pointer;">Autorizar Download do Modelo</button>`);
    }

    return returnResults();

}

(async function main() {
    elements.year.textContent = new Date().getFullYear();

    const reqErrors = await checkRequirements();
    if (reqErrors) {
        elements.output.innerHTML = reqErrors.join('<br/>');
        elements.button.disabled = true;

        const btnDownload = document.getElementById('btn-download');
        if (btnDownload) {
            btnDownload.addEventListener('click', async () => {
                btnDownload.disabled = true;
                btnDownload.textContent = 'Baixando... acompanhe o console';
                try {
                    const session = await LanguageModel.create({
                        expectedInputLanguages: ["pt"],
                        monitor(m) {
                            m.addEventListener('downloadprogress', (e) => {
                                const percent = ((e.loaded / e.total) * 100).toFixed(0);
                                console.log(`Downloaded ${percent}%`);
                                btnDownload.textContent = `Baixando... ${percent}%`;
                            });
                        }
                    });
                    await session.prompt('Olá');
                    session.destroy();
                    window.location.reload();
                } catch(err) {
                    console.error('Error downloading model:', err);
                    btnDownload.textContent = `Erro: ${err.message}`;
                }
            });
        }
        return;
    }

    const params = await LanguageModel.params();
    console.log('Language Model Params:', params);
    /*
    defaultTemperature: 1
    defaultTopK:3
    maxTemperature:2
    maxTopK:128
    */

    elements.topK.max = params.maxTopK;
    elements.topK.min = 1;
    const initialTopK = params.defaultTopK > 0 ? params.defaultTopK : 3;
    elements.topK.value = initialTopK;
    elements.topKValue.textContent = initialTopK;

    elements.temperatureValue.textContent = params.defaultTemperature;
    elements.temperature.max = params.maxTemperature;
    elements.temperature.min = 0;
    elements.temperature.value = params.defaultTemperature;
    return setupEventListeners()
})();

