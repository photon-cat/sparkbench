using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing.Drawing2D;
using System.Drawing.Printing;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace SimTTL
{
    /// <summary>
    /// Class to print the street map. It splits up the large bitmap into pieces of one page to send the complete street map page by page to the printer.
    /// Besides the standard color print mode, a black on white outline test mode can help setting up correct margins or test the geometrical accuracy without wasting colors.
    /// </summary>
    public class PrintContents
    {
        #region Private Fields
        /// <summary>Reference to the PrintDialog object that owns this object.</summary>
        private PrintDialog PrintDialog;
        /// <summary>Reference to the Bitmap object used for drawing.</summary>
        private Bitmap ContentsBitmap;
        /// <summary>Reference to the application settings object to get parameter from.</summary>
        private AppSettings AppSettings;

        /// <summary>Total width of the print area with 100 DPI resolution</summary>
        private float totalWidth;
        /// <summary>Total height of the print area with 100 DPI resolution</summary>
        private float totalHeight;

        /// <summary>Page number counter in x-direction.</summary>
        private int pageX;
        /// <summary>Page number counter in y-direction.</summary>
        private int pageY;

        /// <summary>Printing offset in the virtual large bitmap in x-direction.</summary>
        private float offsX;
        /// <summary>Printing offset in the virtual large bitmap in y-direction.</summary>
        private float offsY;

        private int pageCount;
        #endregion Private Fields

        #region Public Fields
        /// <summary>Reference to the PrintDocument object to print to.</summary>
        public PrintDocument PrintDocument;
        /// <summary>Total number of pages to print.</summary>
        public int TotalPages;
        #endregion Public Fields

        #region Constructor

        /// <summary>
        /// Creates an instance of the PrintContents class for printing. The constructor creates the PrintDocument.
        /// </summary>
        /// <param name="StreetMap">Reference to the StreetMap object used for drawing.</param>
        /// <param name="AppSettings">Reference to the application settings object to get parameter from.</param>
        public PrintContents(PrintDialog PrintDialog, Bitmap ContentsBitmap, AppSettings AppSettings)
        {
            this.PrintDialog = PrintDialog;
            this.ContentsBitmap = ContentsBitmap;
            this.AppSettings = AppSettings;

            totalWidth = ContentsBitmap.Width;          
            totalHeight = ContentsBitmap.Height;        

            PrintDocument = new PrintDocument();
            PrintDocument.DefaultPageSettings = (PageSettings)AppSettings.PrintPageSettings.Clone();

            PrintDocument.BeginPrint += PrintDocument_BeginPrint;
            PrintDocument.PrintPage += PrintDocument_PrintPage;

            int w, h;
            if (AppSettings.PrintPageSettings.Landscape == true)
            {
                w = AppSettings.PrintPageSettings.PaperSize.Height - AppSettings.PrintPageSettings.Margins.Left - AppSettings.PrintPageSettings.Margins.Right;
                h = AppSettings.PrintPageSettings.PaperSize.Width - AppSettings.PrintPageSettings.Margins.Top - AppSettings.PrintPageSettings.Margins.Bottom;
            }
            else
            {
                w = AppSettings.PrintPageSettings.PaperSize.Width - AppSettings.PrintPageSettings.Margins.Left - AppSettings.PrintPageSettings.Margins.Right;
                h = AppSettings.PrintPageSettings.PaperSize.Height - AppSettings.PrintPageSettings.Margins.Top - AppSettings.PrintPageSettings.Margins.Bottom;
            }
            TotalPages = (int)Math.Ceiling(totalWidth / w) * (int)Math.Ceiling(totalHeight / h);
        }
        #endregion Constructor

        #region Private Methods
        /// <summary>
        /// Begin Print event handler of the PrintDocument called before starting the print. It is used to reset the page counters and offsets.
        /// </summary>
        /// <param name="sender">Sender of the event.</param>
        /// <param name="e">Event arguments.</param>
        private void PrintDocument_BeginPrint(object sender, PrintEventArgs e)
        {
            pageX = 0;
            pageY = 0;
            offsX = 0;
            offsY = 0;
            pageCount = 0;
        }

        /// <summary>
        /// Increase pageCount and calculate offsets and coordinates in x and y for the next page to print.
        /// </summary>
        /// <param name="w">Print width exluding the margins.</param>
        /// <param name="h">Print height exluding the margins.</param>
        /// <returns>True if more pages to print, false when done.</returns>
        private bool PrepareNextPage(int w, int h)
        {
            pageCount++;
            pageX++;
            offsX += w;
            if (offsX >= totalWidth)
            {
                pageX = 0;
                offsX = 0;
                pageY++;
                offsY += h;
            }
            return (offsY < totalHeight);
        }

        /// <summary>
        /// Print Page event handler of the PrintDocument. Since creating a huge bitmap for the complete StreetMap with 100dpi resolution is not possible, 
        /// a smaller bitmap is created for each page with the origin moved to offsetX and offsetY. The complete StreetMap is printed to it,
        /// so the bitmap will contain the correct partial image.
        /// </summary>
        /// <param name="sender">Sender of the event.</param>
        /// <param name="e">Event arguments.</param>
        private void PrintDocument_PrintPage(object sender, PrintPageEventArgs e)
        {
            int w = e.MarginBounds.Width;
            int h = e.MarginBounds.Height;
            int x = e.MarginBounds.X;
            int y = e.MarginBounds.Y;

            // If printing starts at a requested page number, move forward to it
            if (PrintDialog.PrinterSettings.PrintRange == PrintRange.SomePages)
                while (pageCount < PrintDialog.PrinterSettings.FromPage - 1)
                    PrepareNextPage(w, h);

            Bitmap bmPage = new Bitmap(w, h);
            Graphics grfx = Graphics.FromImage(bmPage);
            grfx.Clear(Color.White);

            grfx.TranslateTransform((float)(-offsX), (float)(-offsY), MatrixOrder.Prepend);
            grfx.DrawImage(ContentsBitmap, 0, 0);

            e.Graphics.DrawImageUnscaled(bmPage, x, y);
            bmPage.Dispose();

            e.HasMorePages = PrepareNextPage(w, h);

            // if there are still more pages but an end page is given, overwrite the flag
            if ((e.HasMorePages == true) && (PrintDialog.PrinterSettings.PrintRange == PrintRange.SomePages))
                e.HasMorePages = pageCount < PrintDialog.PrinterSettings.ToPage;
        }
        #endregion Private Methods

        #region Public Methods
        /// <summary>
        /// Creates and shows the PrintPreviewDialog and assignes it's PrintDocument to it.
        /// </summary>
        public void Preview()
        {
            PrintPreviewDialog printPreviewDialog = new PrintPreviewDialog();
            printPreviewDialog.Document = PrintDocument;
            printPreviewDialog.Show();
        }

        /// <summary>
        /// Prints the StreetMap contents by calling the Print method of the PrintDocument./
        /// </summary>
        public void Print()
        {
            PrintDocument.Print();
        }
        #endregion Public Methods
    }

}
