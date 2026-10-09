import { normalizePhone } from './validation';
import { supabaseAdmin, isServerSupabaseConfigured } from './supabaseAdmin';
import { mockStore } from './mockStore';
import { Report, ReportStatus } from './types';

/**
 * Submits a new report on a phone number from the student portal.
 */
export async function submitReport(data: {
  reported_phone: string;
  category: string;
  details?: string;
  reporter_name?: string;
  reporter_phone?: string;
}): Promise<Report> {
  const rawReported = (data.reported_phone || '').trim();
  const normalizedReported = normalizePhone(rawReported);

  if (!normalizedReported || normalizedReported.length !== 10) {
    throw new Error('Please enter a valid 10-digit phone number to report.');
  }

  const category = (data.category || '').trim();
  if (!category) {
    throw new Error('Please select a reason or category for this report.');
  }

  const details = (data.details || '').trim();
  const reporterName = (data.reporter_name || '').trim() || 'Anonymous Student';
  const reporterPhone = data.reporter_phone ? normalizePhone(data.reporter_phone) : '';

  if (!isServerSupabaseConfigured || !supabaseAdmin) {
    return mockStore.addReport({
      reported_phone: rawReported,
      category,
      details,
      reporter_name: reporterName,
      reporter_phone: reporterPhone,
    });
  }

  try {
    const payload = {
      reported_phone: rawReported,
      reported_phone_normalized: normalizedReported,
      reporter_name: reporterName,
      reporter_phone: reporterPhone,
      category,
      details: details || null,
      status: 'pending',
    };

    const { data: inserted, error } = await supabaseAdmin
      .from('reports')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.warn('Supabase insert report error, falling back to mockStore:', error.message);
      return mockStore.addReport({
        reported_phone: rawReported,
        category,
        details,
        reporter_name: reporterName,
        reporter_phone: reporterPhone,
      });
    }

    return inserted as Report;
  } catch (err: any) {
    console.error('submitReport error, using mock fallback:', err);
    return mockStore.addReport({
      reported_phone: rawReported,
      category,
      details,
      reporter_name: reporterName,
      reporter_phone: reporterPhone,
    });
  }
}

/**
 * Fetches all reports for the admin dashboard.
 */
export async function fetchAllReports(searchQuery?: string): Promise<Report[]> {
  if (!isServerSupabaseConfigured || !supabaseAdmin) {
    return mockStore.getReports(searchQuery);
  }

  try {
    let query = supabaseAdmin
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      const norm = normalizePhone(q);
      if (norm) {
        query = query.or(`reported_phone.ilike.%${q}%,reported_phone_normalized.ilike.%${norm}%,reporter_name.ilike.%${q}%,category.ilike.%${q}%`);
      } else {
        query = query.or(`reported_phone.ilike.%${q}%,reporter_name.ilike.%${q}%,category.ilike.%${q}%,details.ilike.%${q}%`);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Error querying reports table, using mockStore:', error.message);
      return mockStore.getReports(searchQuery);
    }

    return (data as Report[]) || [];
  } catch (err) {
    console.error('fetchAllReports error:', err);
    return mockStore.getReports(searchQuery);
  }
}

/**
 * Updates a report's status (e.g. investigating, resolved, dismissed).
 */
export async function updateReportStatus(id: string, status: ReportStatus): Promise<boolean> {
  if (!isServerSupabaseConfigured || !supabaseAdmin) {
    return mockStore.updateReportStatus(id, status);
  }

  try {
    const updatePayload: any = {
      status,
    };
    if (status === 'resolved' || status === 'dismissed') {
      updatePayload.resolved_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from('reports')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.warn('Error updating report status in Supabase:', error.message);
      return mockStore.updateReportStatus(id, status);
    }

    return true;
  } catch (err) {
    console.error('updateReportStatus error:', err);
    return mockStore.updateReportStatus(id, status);
  }
}

/**
 * Deletes a report record (Admin only).
 */
export async function deleteReport(id: string): Promise<boolean> {
  if (!isServerSupabaseConfigured || !supabaseAdmin) {
    return mockStore.deleteReport(id);
  }

  try {
    const { error } = await supabaseAdmin
      .from('reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Error deleting report in Supabase:', error.message);
      return mockStore.deleteReport(id);
    }

    return true;
  } catch (err) {
    console.error('deleteReport error:', err);
    return mockStore.deleteReport(id);
  }
}
