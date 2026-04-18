'use client';

import React, { useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

interface CampaignWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

export const CampaignWizard: React.FC<CampaignWizardProps> = ({ onClose, onComplete }) => {
  const t = useT();
  const fetch = useFetch();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [goal, setGoal] = useState('awareness');
  const [platform, setPlatform] = useState('meta');
  
  // Budget & Audience State
  const [dailyBudget, setDailyBudget] = useState(20);
  const [location, setLocation] = useState('');
  const [ageRange, setAgeRange] = useState('18-65+');
  const [audienceTags, setAudienceTags] = useState<string[]>([]); // For CRM filtering
  
  // Creative State
  const [headline, setHeadline] = useState('');
  const [primaryText, setPrimaryText] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');

  const isBroadcast = platform === 'whatsapp' || platform === 'sms' || platform === 'email';

  const handleNext = () => setStep((s) => Math.min(s + 1, 3));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const config = {
        location,
        ageRange,
        audienceTags,
      };

      const creative = {
        headline,
        primaryText,
        destinationUrl,
      };

      await fetch('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
          platform,
          type: goal,
          budget: isBroadcast ? null : dailyBudget,
          config: JSON.stringify(config),
          creative: JSON.stringify(creative),
          status: 'DRAFT', // Always start in draft mode
        }),
      });
      onComplete();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── STEP 1: Goal & Platform ────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <label className="text-sm text-gray-400 block mb-2">{t('campaign_name', 'Campaign Name')}</label>
        <input
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="e.g. Summer Sale 2026"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-[#FC69FF]/50 transition"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-3">{t('select_platform', '1. Select Platform')}</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { id: 'meta', label: 'Meta Ads', icon: 'facebook', type: 'inbound' },
            { id: 'google', label: 'Google Ads', icon: 'google', type: 'inbound' },
            { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', type: 'outbound' },
            { id: 'sms', label: 'SMS Campaign', icon: 'chat', type: 'outbound' },
            { id: 'email', label: 'Email Marketing', icon: 'email', type: 'outbound' },
          ].map((p) => (
            <div
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`p-4 rounded-xl border cursor-pointer transition flex flex-col items-center gap-2 text-center ${
                platform === p.id
                  ? 'border-[#FC69FF] bg-[#AA0FA4]/20'
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/20'
              }`}
            >
              <img src={`/icons/platforms/${p.icon}.png`} alt={p.label} className="w-8 h-8 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
              <div>
                <div className="font-semibold text-sm">{p.label}</div>
                <div className={`text-[10px] mt-1 px-1.5 py-0.5 rounded-full inline-block ${p.type === 'inbound' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {p.type === 'inbound' ? 'Inbound Ads' : 'Outbound CRM'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-3">{t('select_goal', '2. Select Goal')}</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'awareness', label: 'Brand Awareness', desc: 'Show to people most likely to remember them.' },
            { id: 'traffic', label: 'Traffic', desc: 'Send people to a destination, like your website.' },
            { id: 'leads', label: 'Leads', desc: 'Collect information from accounts interested in your business.' },
            { id: 'conversions', label: 'Conversions', desc: 'Find people likely to purchase or take action.' },
            { id: 'broadcast', label: 'Direct Broadcast', desc: 'Send a targeted message to your CRM.' },
          ].map((g) => {
            // Disable certain goals entirely based on platform type
            const isDisabled = isBroadcast && g.id !== 'broadcast';
            
            return (
              <div
                key={g.id}
                onClick={() => !isDisabled && setGoal(g.id)}
                className={`p-4 rounded-xl border transition flex flex-col gap-1 ${
                  isDisabled ? 'opacity-30 cursor-not-allowed border-white/5 bg-transparent' :
                  goal === g.id
                    ? 'border-[#FC69FF] bg-[#AA0FA4]/20 cursor-pointer'
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/5 cursor-pointer'
                }`}
              >
                <div className="font-semibold text-sm">{g.label}</div>
                <div className="text-xs text-gray-500">{g.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─── STEP 2: Audience & Budget ──────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {isBroadcast ? (
        <>
          <div className="bg-[#0f0f18] p-5 rounded-xl border border-white/5">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Internal CRM Targeting
            </h3>
            <p className="text-sm text-gray-400 mb-5">Select exactly which leads in SwiftsAI should receive this broadcast.</p>
            
            <label className="text-sm text-gray-400 block mb-2">{t('target_stages', 'Target Specific Pipeline Stages')}</label>
            <div className="flex flex-wrap gap-2">
              {['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'].map((stage) => {
                const isSelected = audienceTags.includes(stage);
                return (
                  <button
                    key={stage}
                    onClick={() => {
                      if (isSelected) setAudienceTags(audienceTags.filter(t => t !== stage));
                      else setAudienceTags([...audienceTags, stage]);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded border transition ${
                      isSelected ? 'bg-[#AA0FA4]/30 border-[#FC69FF] text-white' : 'bg-transparent border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                    }`}
                  >
                    {isSelected && <span className="mr-1">✓</span>}
                    {stage}
                  </button>
                );
              })}
            </div>
            {audienceTags.length === 0 && (
              <p className="text-[11px] text-yellow-500/70 mt-2">If no stages are selected, the broadcast will target ALL your leads.</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="bg-[#0f0f18] p-5 rounded-xl border border-white/5">
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              External Audience (Meta/GoogleAds)
            </h3>
            <p className="text-sm text-gray-400 mb-5">Define who should see your ads across the internet.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">{t('location', 'Location targeting')}</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. United States, London"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-[#FC69FF]/50"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-2">{t('age', 'Age Range')}</label>
                <select 
                  value={ageRange}
                  onChange={(e) => setAgeRange(e.target.value)}
                  className="w-full bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#FC69FF]/50"
                >
                  <option value="18-65+">18 - 65+</option>
                  <option value="18-24">18 - 24</option>
                  <option value="25-34">25 - 34</option>
                  <option value="35-44">35 - 44</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-[#0f0f18] p-5 rounded-xl border border-white/5">
            <h3 className="text-lg font-semibold mb-4">Budget & Schedule</h3>
            <label className="text-sm text-gray-400 block mb-2">Daily Budget</label>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                <input
                  type="number"
                  min="5"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-2.5 text-white text-lg font-semibold outline-none focus:border-[#FC69FF]/50"
                />
              </div>
              <div className="flex-1 text-xs text-gray-400">
                You will spend an average of <span className="font-bold text-white">${dailyBudget}</span> per day. Ads will run until you pause them.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ─── STEP 3: Creative & Review ──────────────────────────────────────────────
  const renderStep3 = () => (
    <div className="flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      
      {/* Editing Form */}
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <label className="text-sm text-gray-400 block mb-2">{t('primary_text', 'Primary Text')}</label>
          <textarea
            value={primaryText}
            onChange={(e) => setPrimaryText(e.target.value)}
            rows={4}
            placeholder={isBroadcast ? "Hey there! We have a special offer for you..." : "Tell people what your ad is about..."}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-[#FC69FF]/50 resize-none"
          />
        </div>

        {!isBroadcast && (
          <>
            <div>
              <label className="text-sm text-gray-400 block mb-2">{t('headline', 'Headline')}</label>
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Write a short, catchy headline"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-[#FC69FF]/50"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">{t('destination', 'Destination URL')}</label>
              <input
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-[#FC69FF]/50"
              />
            </div>
          </>
        )}

        <div className="p-4 border border-dashed border-white/20 rounded-xl bg-white/[0.02] flex flex-col items-center justify-center text-center mt-2 cursor-pointer hover:bg-white/5 transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 mb-2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          <div className="text-sm text-[#FC69FF] font-medium">Add Media</div>
          <div className="text-xs text-gray-500">Pick from SwiftsAI library</div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="w-[300px] border border-white/10 bg-[#0f0f18] rounded-xl overflow-hidden flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-white/10 text-xs font-semibold uppercase text-gray-400 tracking-wider">
          {platform.toUpperCase()} Preview
        </div>
        <div className="p-4 flex-1">
          {/* Mock Post / Message */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#AA0FA4] to-[#FC69FF]" />
            <div>
              <div className="text-xs font-semibold text-white">Your Business</div>
              <div className="text-[10px] text-gray-500">Sponsored</div>
            </div>
          </div>
          <div className="text-xs text-gray-300 whitespace-pre-wrap mb-3 line-clamp-4">
            {primaryText || "Your primary text will appear right here."}
          </div>
          <div className="aspect-square bg-white/5 rounded-lg border border-white/5 flex items-center justify-center text-gray-600 mb-3">
            [Media Selection]
          </div>
          {!isBroadcast && (
            <div className="bg-white/5 p-3 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-400 uppercase truncate max-w-[150px]">{destinationUrl?.replace('https://','') || 'YOURWEBSITE.COM'}</div>
                <div className="text-sm font-semibold text-white truncate max-w-[150px]">{headline || "Your headline here"}</div>
              </div>
              <button className="px-3 py-1.5 bg-white/10 rounded-md text-xs font-medium hover:bg-white/20">Action</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col bg-[#0a0a0f] text-white">
      {/* HEADER PROGRESS */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          {[1, 2, 3].map((num) => (
            <div key={num} className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${
                step === num ? 'bg-[#FC69FF] text-white shadow-[0_0_15px_rgba(252,105,255,0.4)]' :
                step > num ? 'bg-[#AA0FA4]/50 text-white border border-[#FC69FF]' :
                'bg-white/5 text-gray-500 border border-white/10'
              }`}>
                {step > num ? '✓' : num}
              </div>
              {num < 3 && <div className="w-8 h-[2px] bg-white/10" />}
            </div>
          ))}
        </div>
      </div>

      {/* BODY AREA */}
      <div className="p-6 h-[480px] overflow-y-auto custom-scrollbar">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-6 border-t border-white/10 bg-[#0f0f18] flex items-center justify-between">
        <Button onClick={onClose} secondary className="!bg-white/5 hover:!bg-white/10 !border-white/10">Cancel</Button>
        
        <div className="flex gap-3">
          {step > 1 && (
            <Button onClick={handlePrev} secondary className="!bg-white/5 hover:!bg-white/10 !border-white/10">Back</Button>
          )}
          {step < 3 ? (
            <Button onClick={handleNext} className="!bg-[#AA0FA4] hover:!bg-[#FC69FF] transition">Next step</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="!bg-[#AA0FA4] hover:!bg-[#FC69FF] transition">
              {isSubmitting ? 'Saving...' : 'Save Draft Campaign'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
