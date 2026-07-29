import QRCode from 'qrcode';

export interface QRCodeGenerationOptions {
  wallId?: string;
  tab?: string;
  width?: number;
  margin?: number;
  fgColor?: string; // hex color for the QR pattern
  bgColor?: string; // hex color for the QR background
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Formats the direct public deep-link URL for a specific campaign.
 * Can target the global campaign, a specific wall (point of interest), or an activities tab.
 * 
 * @param campaignId Unique campaign ID
 * @param options Routing options (wallId or tab)
 * @returns Fully-qualified destination URL
 */
export function getCampaignViewUrl(campaignId: string, options?: { wallId?: string; tab?: string }): string {
  if (!campaignId) {
    throw new Error('Campaign ID is required to generate the destination URL.');
  }

  // Fallback to window.location if running in a browser, or placeholder for SSR/server-side context
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://festiv.app';
  const basePath = typeof window !== 'undefined' ? window.location.pathname : '/';
  
  const url = new URL(basePath, origin);
  url.searchParams.set('id', campaignId);

  if (options?.wallId) {
    url.searchParams.set('wall', options.wallId);
  } else if (options?.tab) {
    url.searchParams.set('tab', options.tab);
  }

  return url.toString();
}

/**
 * Generates a high-quality PNG QR Code Data URL for a campaign.
 * Perfect for embedding in dashboard UIs, emailing to clients, or printing on marketing materials.
 * 
 * @param campaignId Unique campaign ID
 * @param options Custom styling and routing options
 * @returns Promise resolving to the PNG Data URL string (data:image/png;base64,...)
 */
export async function generateQRCodeDataURL(
  campaignId: string, 
  options: QRCodeGenerationOptions = {}
): Promise<string> {
  const targetUrl = getCampaignViewUrl(campaignId, { 
    wallId: options.wallId, 
    tab: options.tab 
  });

  const qrOptions: QRCode.QRCodeToDataURLOptions = {
    width: options.width ?? 512,
    margin: options.margin ?? 4,
    color: {
      dark: options.fgColor ?? '#4f46e5',
      light: options.bgColor ?? '#ffffff'
    },
    errorCorrectionLevel: options.errorCorrectionLevel ?? 'H'
  };

  try {
    return await QRCode.toDataURL(targetUrl, qrOptions);
  } catch (error) {
    console.error('Error generating QR Code Data URL:', error);
    throw new Error(`Failed to generate campaign QR code: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generates a vector SVG QR Code string for a campaign.
 * Perfect for professional print layouts, high-resolution vector scaling, and digital displays.
 * 
 * @param campaignId Unique campaign ID
 * @param options Custom styling and routing options
 * @returns Promise resolving to the raw SVG markup string
 */
export async function generateQRCodeSVGString(
  campaignId: string, 
  options: QRCodeGenerationOptions = {}
): Promise<string> {
  const targetUrl = getCampaignViewUrl(campaignId, { 
    wallId: options.wallId, 
    tab: options.tab 
  });

  const qrOptions: QRCode.QRCodeToStringOptions = {
    type: 'svg',
    margin: options.margin ?? 4,
    color: {
      dark: options.fgColor ?? '#4f46e5',
      light: options.bgColor ?? '#ffffff'
    },
    errorCorrectionLevel: options.errorCorrectionLevel ?? 'H'
  };

  try {
    return await QRCode.toString(targetUrl, qrOptions);
  } catch (error) {
    console.error('Error generating QR Code SVG String:', error);
    throw new Error(`Failed to generate campaign QR code SVG: ${error instanceof Error ? error.message : String(error)}`);
  }
}
