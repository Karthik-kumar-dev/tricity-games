import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { fetchAllReports, updateReportStatus, deleteReport } from '@/lib/reportService';
import { ReportStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Fetch all reports for admin dashboard
export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || searchParams.get('q') || '';

    const reports = await fetchAllReports(search);
    const pendingCount = reports.filter((r) => r.status === 'pending').length;
    const resolvedCount = reports.filter((r) => r.status === 'resolved').length;

    return NextResponse.json({
      success: true,
      reports,
      counts: {
        total: reports.length,
        pending: pendingCount,
        resolved: resolvedCount,
      },
    });
  } catch (err: any) {
    console.error('Error fetching reports for admin:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch reports.' },
      { status: 500 }
    );
  }
}

// PATCH: Update report status (e.g. mark as resolved, investigating, dismissed)
export async function PATCH(request: NextRequest) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Report ID and new status are required.' },
        { status: 400 }
      );
    }

    const validStatuses: ReportStatus[] = ['pending', 'investigating', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status: ${status}. Must be one of ${validStatuses.join(', ')}.` },
        { status: 400 }
      );
    }

    const success = await updateReportStatus(id, status);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update report status.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Report status updated to ${status}.`,
    });
  } catch (err: any) {
    console.error('Error updating report status:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update report status.' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a report
export async function DELETE(request: NextRequest) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Report ID is required.' },
        { status: 400 }
      );
    }

    const success = await deleteReport(id);
    return NextResponse.json({
      success,
      message: success ? 'Report deleted successfully.' : 'Report not found.',
    });
  } catch (err: any) {
    console.error('Error deleting report:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete report.' },
      { status: 500 }
    );
  }
}
