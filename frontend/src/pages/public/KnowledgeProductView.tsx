import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { SEO } from '../../components/seo/SEO';
import { NotFound } from './NotFound';
import {
  fetchKnowledgeProduct,
  KNOWLEDGE_PRODUCT_TYPES,
  type KnowledgeProductType,
  type PublishedKnowledgeProduct,
} from '../../services/knowledgeProduct.service';

const LABELS: Record<KnowledgeProductType, string> = {
  communique: 'Summit Communiqué',
  proceedings: 'AI in Health Summit Proceedings',
  policyBrief: 'National Policy Brief',
  technicalReport: 'Technical Report',
  actionPlan: 'Action Plan for AI in Health Implementation',
};

export const KnowledgeProductView = () => {
  const { type } = useParams<{ type: string }>();
  const [doc, setDoc] = useState<PublishedKnowledgeProduct | null>(null);
  const [notFound, setNotFound] = useState(false);

  const isValidType = (t: string | undefined): t is KnowledgeProductType =>
    !!t && (KNOWLEDGE_PRODUCT_TYPES as readonly string[]).includes(t);

  useEffect(() => {
    if (!isValidType(type)) {
      setNotFound(true);
      return;
    }
    fetchKnowledgeProduct(type)
      .then(setDoc)
      .catch(() => setNotFound(true));
  }, [type]);

  if (notFound) return <NotFound />;
  if (!doc) return null;

  const label = LABELS[doc.type];

  return (
    <>
      <SEO
        title={label}
        description={`${label} — AI in Health Summit 2026.`}
        path={`/knowledge-products/${doc.type}`}
      />
      <PageHero
        eyebrow="Knowledge Product"
        title={label}
        subtitle={`Published ${new Date(doc.approvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      />

      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl space-y-10 px-4 sm:px-6 lg:px-8">
          {doc.sections.map((section, i) => (
            <Reveal key={section.heading} delay={i * 0.05}>
              <h2 className="font-display text-xl font-semibold text-navy">{section.heading}</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{section.content}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
};
