import { useNavigate, useParams } from 'react-router-dom';
import InvoiceFormDialog from '../../components/ui/InvoiceFormDialog';

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  return (
    <div className="py-6">
      <InvoiceFormDialog
        isOpen={true}
        mode={isEdit ? 'edit' : 'create'}
        invoiceId={id ? parseInt(id, 10) : null}
        onClose={() => navigate('/invoices')}
        onSuccess={(inv) => {
          if (inv?.id) {
            navigate(`/invoices/${inv.id}`);
          } else {
            navigate('/invoices');
          }
        }}
      />
    </div>
  );
}
