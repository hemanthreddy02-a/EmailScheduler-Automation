import React, { useState, useEffect } from "react";
import { Modal } from "./ui/Modal.js";
import { Input } from "./ui/Input.js";
import { Textarea } from "./ui/Textarea.js";
import { Select } from "./ui/Select.js";
import { Button } from "./ui/Button.js";
import { FileUploader } from "./ui/FileUploader.js";
import { useSenders, useScheduleEmails } from "../hooks/useEmailJobs.js";
import { Send, Calendar, Clock, Gauge, UserCheck, AlertTriangle } from "lucide-react";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { data: senders, isLoading: isLoadingSenders } = useSenders();
  const scheduleMutation = useScheduleEmails();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [senderId, setSenderId] = useState("");
  
  // Default start time to now formatted as YYYY-MM-THH:mm
  const getInitialStartTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // 1 minute in the future
    return now.toISOString().slice(0, 16);
  };
  
  const [startTime, setStartTime] = useState(getInitialStartTime());
  const [delaySec, setDelaySec] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);
  const [showSummary, setShowSummary] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Set default senderId when senders load
  useEffect(() => {
    if (senders && senders.length > 0 && !senderId) {
      setSenderId(senders[0]!.id);
    }
  }, [senders, senderId]);

  const handleParsedRecipients = (valid: string[]) => {
    setRecipients(valid);
  };

  const handleProceedToSummary = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!subject.trim()) {
      setFormError("Subject is required");
      return;
    }
    if (!body.trim()) {
      setFormError("Body text is required");
      return;
    }
    if (recipients.length === 0) {
      setFormError("Please upload a file containing at least one valid recipient");
      return;
    }
    if (!senderId) {
      setFormError("Please select a sender account");
      return;
    }
    if (!startTime) {
      setFormError("Start time is required");
      return;
    }
    if (delaySec <= 0) {
      setFormError("Delay must be a positive number of seconds");
      return;
    }
    if (hourlyLimit <= 0) {
      setFormError("Hourly limit must be a positive number");
      return;
    }

    setShowSummary(true);
  };

  const handleFinalSubmit = () => {
    setFormError(null);

    const isoStartTime = new Date(startTime).toISOString();

    scheduleMutation.mutate(
      {
        subject,
        body,
        recipients,
        senderId,
        startTime: isoStartTime,
        delayMs: delaySec * 1000,
        hourlyLimit,
      },
      {
        onSuccess: (data) => {
          onSuccess(data.scheduled);
          resetForm();
          onClose();
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.error?.message ||
            "Failed to schedule emails. Please try again.";
          setFormError(msg);
          setShowSummary(false);
        },
      }
    );
  };

  const resetForm = () => {
    setSubject("");
    setBody("");
    setRecipients([]);
    setStartTime(getInitialStartTime());
    setDelaySec(2);
    setHourlyLimit(100);
    setShowSummary(false);
    setFormError(null);
  };

  const selectedSenderObj = senders?.find((s) => s.id === senderId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Compose New Email Campaign"
      subtitle="Configure recipient list, sending schedule, and rate limits"
      maxWidth="2xl"
    >
      {formError && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {!showSummary ? (
        <form onSubmit={handleProceedToSummary} className="space-y-3">
          <Input
            label="Subject"
            placeholder="e.g. Scaling outreach with ReachInbox"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          <Textarea
            label="Body (HTML supported)"
            placeholder="Hi {{name}}, I wanted to reach out regarding..."
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />

          <FileUploader onParsedRecipients={handleParsedRecipients} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <Select
              label="Sender Account"
              options={
                senders?.map((s) => ({ value: s.id, label: s.email })) || [
                  { value: "", label: isLoadingSenders ? "Loading..." : "No senders" },
                ]
              }
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              disabled={isLoadingSenders || !senders?.length}
            />

            <Input
              label="Start Time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Delay between emails (seconds)"
              type="number"
              min={1}
              max={3600}
              value={delaySec}
              onChange={(e) => setDelaySec(parseInt(e.target.value, 10) || 1)}
              helperText="Minimum delay enforced per sender"
              required
            />

            <Input
              label="Hourly Email Limit"
              type="number"
              min={1}
              max={10000}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
              helperText="Distributed Redis rate limit"
              required
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-gray-100 sticky bottom-0 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={recipients.length === 0}
              rightIcon={<Send className="w-4 h-4" />}
            >
              Review Campaign ({recipients.length} recipients)
            </Button>
          </div>
        </form>
      ) : (
        /* Confirmation Summary */
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="p-4 bg-brand-50/60 border border-brand-100 rounded-xl space-y-3">
            <h4 className="text-sm font-semibold text-brand-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-brand-600" /> Campaign Summary
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-gray-700">
                <UserCheck className="w-4 h-4 text-gray-400" />
                <span>
                  Recipients: <strong className="text-gray-900">{recipients.length} valid</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  Start: <strong className="text-gray-900">{new Date(startTime).toLocaleString()}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>
                  Delay: <strong className="text-gray-900">{delaySec} seconds</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <Gauge className="w-4 h-4 text-gray-400" />
                <span>
                  Rate Limit: <strong className="text-gray-900">{hourlyLimit}/hour</strong>
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-brand-100 text-xs text-gray-600">
              Sender: <strong className="text-gray-900">{selectedSenderObj?.email}</strong>
            </div>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 space-y-1">
            <p className="font-semibold text-gray-800">Subject: {subject}</p>
            <p className="line-clamp-2 text-gray-500">{body}</p>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSummary(false)}
            >
              Back to Edit
            </Button>
            <Button
              onClick={handleFinalSubmit}
              isLoading={scheduleMutation.isPending}
              rightIcon={<Send className="w-4 h-4" />}
            >
              Schedule Emails Now
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
