// Guaranteed-to-work letters when every AI is down. Hindi/Telugu: have a native speaker read these once.
import type { Lang, Tone, LetterInput } from "./validate";

type L = {
  greeting: string; intro: string;
  status_polite: string; status_sla: string; status_formal: string;
  ask_polite: string; ask_sla: string; ask_formal: string;
  false_closure: string; signoff: string;
  subj_polite: string; subj_sla: string; subj_formal: string;
};

const T: Record<Lang, L> = {
  en: {
    greeting: "Respected Sir/Madam,",
    intro: "Complaint no. {id} was filed on {filed_date} about the following issue at {location}{ward_part}: {description}.",
    status_polite: "It is still open after {days_open} days.",
    status_sla: "The resolution deadline of {sla_days} days was missed, and the complaint is now {days_overdue} days overdue.",
    status_formal: "Despite earlier reminders, no resolution has been recorded. The complaint has been open for {days_open} days, {days_overdue} days past the {sla_days}-day deadline.",
    ask_polite: "We kindly request you to look into this and update its status at the earliest.",
    ask_sla: "We request you to take action within 48 hours. If there is no response, the case will be escalated to the next officer.",
    ask_formal: "This is a formal notice. We request a written reply stating the action taken and the officer responsible.",
    false_closure: "Note: this complaint was marked as resolved, but photo verification shows that the issue is still present. Photo evidence is on record.",
    signoff: "Thank you,\nOn behalf of the citizen\nNagrikLoop",
    subj_polite: "Reminder: complaint {id} pending at {location}",
    subj_sla: "Complaint {id} is past its resolution deadline",
    subj_formal: "Formal notice: no action on complaint {id}",
  },
  hi: {
    greeting: "आदरणीय महोदय/महोदया,",
    intro: "शिकायत संख्या {id} दिनांक {filed_date} को {location}{ward_part} में निम्नलिखित समस्या के संबंध में दर्ज की गई थी: {description}।",
    status_polite: "{days_open} दिन बाद भी यह शिकायत लंबित है।",
    status_sla: "{sla_days} दिन की निर्धारित समय-सीमा पूरी नहीं हुई है और शिकायत अब {days_overdue} दिन विलंबित है।",
    status_formal: "पूर्व अनुस्मारकों के बावजूद समाधान दर्ज नहीं किया गया है। शिकायत {days_open} दिन से लंबित है, जो {sla_days} दिन की समय-सीमा से {days_overdue} दिन अधिक है।",
    ask_polite: "कृपया इस पर शीघ्र ध्यान दें और स्थिति अपडेट करें।",
    ask_sla: "कृपया 48 घंटे के भीतर कार्रवाई करें। उत्तर न मिलने पर मामला अगले अधिकारी को भेजा जाएगा।",
    ask_formal: "यह एक औपचारिक सूचना है। कृपया की गई कार्रवाई और उत्तरदायी अधिकारी का नाम बताते हुए लिखित उत्तर दें।",
    false_closure: "ध्यान दें: इस शिकायत को निपटाया हुआ दर्शाया गया था, लेकिन फोटो सत्यापन में समस्या अब भी मौजूद है। फोटो साक्ष्य रिकॉर्ड में है।",
    signoff: "धन्यवाद,\nनागरिक की ओर से\nNagrikLoop",
    subj_polite: "अनुस्मारक: शिकायत {id} {location} पर लंबित",
    subj_sla: "शिकायत {id} की समाधान समय-सीमा समाप्त",
    subj_formal: "औपचारिक सूचना: शिकायत {id} पर कोई कार्रवाई नहीं",
  },
  te: {
    greeting: "గౌరవనీయులైన అధికారికి,",
    intro: "{filed_date} తేదీన {location}{ward_part} వద్ద ఈ క్రింది సమస్య గురించి ఫిర్యాదు సంఖ్య {id} నమోదు చేయబడింది: {description}.",
    status_polite: "{days_open} రోజులు గడిచినా ఈ ఫిర్యాదు ఇంకా పరిష్కారం కాలేదు.",
    status_sla: "{sla_days} రోజుల నిర్ణీత గడువు ముగిసింది, ఫిర్యాదు ఇప్పుడు {days_overdue} రోజులు ఆలస్యమైంది.",
    status_formal: "ఇంతకు ముందు గుర్తు చేసినప్పటికీ పరిష్కారం నమోదు కాలేదు. ఫిర్యాదు {days_open} రోజులుగా పెండింగ్‌లో ఉంది, ఇది {sla_days} రోజుల గడువును {days_overdue} రోజులు దాటింది.",
    ask_polite: "దయచేసి త్వరగా పరిశీలించి, స్థితిని తెలియజేయండి.",
    ask_sla: "దయచేసి 48 గంటల్లోగా చర్య తీసుకోండి. స్పందన లేకపోతే ఈ కేసు తదుపరి అధికారికి పంపబడుతుంది.",
    ask_formal: "ఇది అధికారిక నోటీసు. తీసుకున్న చర్య మరియు బాధ్యులైన అధికారి వివరాలతో లిఖితపూర్వక సమాధానం ఇవ్వగలరు.",
    false_closure: "గమనిక: ఈ ఫిర్యాదు పరిష్కరించబడినట్లు చూపబడింది, కానీ ఫోటో ధృవీకరణలో సమస్య ఇంకా ఉన్నట్లు తేలింది. ఫోటో ఆధారాలు రికార్డులో ఉన్నాయి.",
    signoff: "ధన్యవాదాలు,\nపౌరుని తరఫున\nNagrikLoop",
    subj_polite: "గుర్తుచేత: ఫిర్యాదు {id} {location} వద్ద పెండింగ్‌లో ఉంది",
    subj_sla: "ఫిర్యాదు {id} గడువు దాటింది",
    subj_formal: "అధికారిక నోటీసు: ఫిర్యాదు {id}పై చర్య లేదు",
  },
};

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export function renderTemplate(i: LetterInput, tone: Tone): { subject: string; body: string } {
  const t = T[i.language];
  const v = {
    id: i.complaint_id,
    filed_date: i.filed_at ? i.filed_at.slice(0, 10) : "-",
    location: i.location_text,
    ward_part: i.ward ? ` (${i.ward})` : "",
    description: i.description.replace(/[.\u0964]+$/, ""),
    days_open: i.days_open,
    sla_days: i.sla_days,
    days_overdue: i.days_overdue,
  };
  const status = tone === "polite" ? t.status_polite : tone === "sla_breach" ? t.status_sla : t.status_formal;
  const ask = tone === "polite" ? t.ask_polite : tone === "sla_breach" ? t.ask_sla : t.ask_formal;
  const subject = fill(tone === "polite" ? t.subj_polite : tone === "sla_breach" ? t.subj_sla : t.subj_formal, v);
  const parts = [t.greeting, `${fill(t.intro, v)} ${fill(status, v)}`];
  if (i.false_closure) parts.push(t.false_closure);
  parts.push(ask, t.signoff);
  return { subject, body: parts.join("\n\n") };
}
