import {type FormEvent, useState} from 'react'
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/puter";
import {useNavigate} from "react-router";
import {convertPdfToImage} from "~/lib/pdf2img";
import {generateUUID} from "~/lib/utils";
import {prepareInstructions} from "../../constants";

function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object') {
        const o = err as Record<string, unknown>;
        const text =
            o.message ?? o.error ?? o.detail ?? o.reason ?? o.msg ?? o.statusText ?? o.description;
        if (typeof text === 'string' && text.length > 0) return text;
        if (typeof text === 'object' && text !== null && 'message' in (text as object))
            return String((text as { message?: string }).message);
        try {
            return JSON.stringify(o, null, 0).slice(0, 300) || 'Unknown error (see console)';
        } catch {
            return 'Unknown error (see browser console for details)';
        }
    }
    return 'Something went wrong. Try again.';
}

function parseFeedbackJson(raw: string): Feedback | null {
    try {
        let text = raw.trim();
        const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlock) text = codeBlock[1].trim();
        const firstBrace = text.indexOf('{');
        if (firstBrace !== -1) {
            let depth = 0;
            let end = -1;
            for (let i = firstBrace; i < text.length; i++) {
                if (text[i] === '{') depth++;
                else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
            }
            if (end !== -1) text = text.slice(firstBrace, end + 1);
        }
        return JSON.parse(text) as Feedback;
    } catch {
        return null;
    }
}

const Upload = () => {
    const { auth, isLoading, puterReady, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    const handleFileSelect = (file: File | null) => {
        setFile(file);
        setError(null);
    }

    const callAiFeedback = async (path: string, instructions: string) => {
        const result = await ai.feedback(path, instructions);
        if (result?.message?.content) return result;
        throw new Error('AI did not return feedback');
    };

    const runOneAttempt = async (
        companyName: string,
        jobTitle: string,
        jobDescription: string,
        file: File
    ): Promise<void> => {
        if (!puterReady) throw new Error('Puter is still loading. Wait a moment and try again.');

        setStatusText('Uploading the file...');
        const uploadedFileResult = await fs.upload([file]);
            if(!uploadedFileResult) throw new Error('Failed to upload file');
            const uploadedFile = Array.isArray(uploadedFileResult) ? uploadedFileResult[0] : uploadedFileResult;
            if(!uploadedFile?.path) throw new Error('Failed to get file path');

            setStatusText('Converting to image...');
            const imageFile = await convertPdfToImage(file);
            if(!imageFile.file) throw new Error(imageFile.error ?? 'Failed to convert PDF to image');

            setStatusText('Uploading the image...');
            const uploadedImageResult = await fs.upload([imageFile.file]);
            if(!uploadedImageResult) throw new Error('Failed to upload image');
            const uploadedImage = Array.isArray(uploadedImageResult) ? uploadedImageResult[0] : uploadedImageResult;
            if(!uploadedImage?.path) throw new Error('Failed to get image path');

            setStatusText('Preparing...');
            const uuid = generateUUID();
            const instructions = prepareInstructions({ jobTitle, jobDescription });
            const data = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName, jobTitle, jobDescription,
                feedback: '',
            };
            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            setStatusText('Getting AI feedback (about 15–30 seconds)...');
            let feedback = null;
            try {
                feedback = await callAiFeedback(uploadedFile.path, instructions);
            } catch (firstErr) {
                setStatusText('Retrying AI feedback...');
                await new Promise((r) => setTimeout(r, 2000));
                feedback = await callAiFeedback(uploadedFile.path, instructions);
            }

            if (!feedback?.message?.content) throw new Error('AI did not return feedback. Try again.');

            let feedbackText: string;
            const content = feedback.message.content;
            if (typeof content === 'string') {
                feedbackText = content;
            } else if (Array.isArray(content) && content.length > 0) {
                const first = content[0];
                feedbackText = typeof first === 'string' ? first : (first?.text ?? '');
            } else {
                throw new Error('Invalid AI response format');
            }

            const parsed = parseFeedbackJson(feedbackText);
            if (!parsed) throw new Error('Could not read feedback. Try again.');

            setStatusText('Saving and opening your results...');
            data.feedback = parsed;
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            navigate(`/resume/${uuid}`);
    };

    const handleAnalyze = async ({
        companyName,
        jobTitle,
        jobDescription,
        file,
    }: {
        companyName: string;
        jobTitle: string;
        jobDescription: string;
        file: File;
    }) => {
        setIsProcessing(true);
        setError(null);
        try {
            await runOneAttempt(companyName, jobTitle, jobDescription, file);
        } catch {
            setStatusText('First try failed. Retrying once...');
            await new Promise((r) => setTimeout(r, 2500));
            try {
                await runOneAttempt(companyName, jobTitle, jobDescription, file);
            } catch (retryErr) {
                const message = getErrorMessage(retryErr);
                console.error('Resume analysis error:', retryErr);
                setError(message);
                setStatusText('');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!file) return;
        handleAnalyze({ companyName: '', jobTitle: '', jobDescription: '', file });
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <p className="text-sm text-gray-500 mt-2">You’ll be redirected to your feedback when it’s ready.</p>
                            <img src="/images/resume-scan.gif" className="w-full" alt="" />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}
                    {error && (
                        <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                            <p className="font-medium">Error</p>
                            <p>{error}</p>
                            <p className="mt-2">You can try again below. If it keeps failing, open the browser console (F12 → Console) and look for &quot;Resume analysis error&quot; for details.</p>
                        </div>
                    )}
                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader key={file ? 'has-file' : 'no-file'} onFileSelect={handleFileSelect} />
                            </div>
                            {!puterReady && (
                                <p className="text-sm text-amber-600">Waiting for Puter… Don’t submit yet.</p>
                            )}
                            <button
                                className="primary-button"
                                type="submit"
                                disabled={!puterReady || !file}
                            >
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}
export default Upload
