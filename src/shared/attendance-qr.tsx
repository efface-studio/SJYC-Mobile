import { Image } from 'expo-image';
import QRCode from 'qrcode-generator';
import { useMemo } from 'react';

export function AttendanceQR({ code }: { code: string }) {
  const uri = useMemo(() => {
    const qr = QRCode(0, 'M');
    qr.addData(`SJYC:ATTENDANCE:${code}`, 'Alphanumeric');
    qr.make();
    return qr.createDataURL(6, 24);
  }, [code]);
  return (
    <Image
      accessible
      accessibilityLabel="회원 출석용 QR 코드"
      source={{ uri }}
      contentFit="contain"
      style={{ alignSelf: 'center', width: 180, height: 180 }}
    />
  );
}
