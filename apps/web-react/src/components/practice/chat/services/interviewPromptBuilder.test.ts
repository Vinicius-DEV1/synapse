import { describe, it, expect } from 'vitest';
import { buildInterviewSystemPrompt } from './interviewPromptBuilder';
import type { InterviewConfig } from '../../../../types';

describe('interviewPromptBuilder', () => {
  it('builds a realistic Portuguese interview prompt with mandatory guidelines', () => {
    const config: InterviewConfig = {
      mode: 'interview',
      jobTitle: 'Desenvolvedor Frontend Sênior',
      seniority: 'senior',
      interviewType: 'technical',
      companyName: 'TechCorp',
    };

    const prompt = buildInterviewSystemPrompt(config);

    expect(prompt).toContain('TechCorp');
    expect(prompt).toContain('Desenvolvedor Frontend Sênior');
    expect(prompt).toContain('Sênior');
    expect(prompt).toContain('Técnica e Arquitetura');
    expect(prompt).toContain('NA PRIMEIRA FALA: Dê as boas-vindas ao candidato');
    expect(prompt).toContain('REGRA DE OURO: Faça SEMPRE APENAS UMA pergunta por turno');
  });

  it('builds an English interview prompt when interviewType is english', () => {
    const config: InterviewConfig = {
      mode: 'interview',
      jobTitle: 'Fullstack Engineer',
      seniority: 'lead',
      interviewType: 'english',
    };

    const prompt = buildInterviewSystemPrompt(config);

    expect(prompt).toContain('You are a Senior Talent Lead and Technical Interviewer');
    expect(prompt).toContain('Fullstack Engineer');
    expect(prompt).toContain('Speak ONLY in English');
    expect(prompt).toContain('STRICT RULE: Ask exactly ONE question at a time');
  });

  it('injects resume and job description into prompt when provided', () => {
    const config: InterviewConfig = {
      mode: 'interview',
      jobTitle: 'Product Manager',
      seniority: 'pleno',
      interviewType: 'behavioral',
      resumeText: 'Experiência de 4 anos liderando squads ágeis no setor bancário.',
      jobDescriptionText: 'Responsável por métricas de retenção e roadmap de pagamentos.',
    };

    const prompt = buildInterviewSystemPrompt(config);

    expect(prompt).toContain('--- DESCRIÇÃO E REQUISITOS DA VAGA ---');
    expect(prompt).toContain('Responsável por métricas de retenção');
    expect(prompt).toContain('--- CURRÍCULO E EXPERIÊNCIA DO CANDIDATO ---');
    expect(prompt).toContain('Experiência de 4 anos liderando squads');
  });
});
