// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the logic chip 74HCT154.
    /// </summary>
    public class HCT154 : BaseElement
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/cd74hc154.pdf

        private const double TYP_PROPAGATION_DELAY = 18;

        #region Private Fields
        private Pin[] A;
        #endregion Private Fields

        #region Input Pins
        public Pin E1n;
        public Pin E2n;

        public Pin A0;
        public Pin A1;
        public Pin A2;
        public Pin A3;
        #endregion Input Pins

        #region Output Pins
        public Pin Y0;
        public Pin Y1;
        public Pin Y2;
        public Pin Y3;
        public Pin Y4;
        public Pin Y5;
        public Pin Y6;
        public Pin Y7;
        public Pin Y8;
        public Pin Y9;
        public Pin Y10;
        public Pin Y11;
        public Pin Y12;
        public Pin Y13;
        public Pin Y14;
        public Pin Y15;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT154(string Name) : this(Name, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT154(string Name, Net NetE1n, Net NetE2n, Net NetA0, Net NetA1, Net NetA2, Net NetA3) : base(Name)
        {
            this.Power[0] = new Pin(this,  "VCC", "24");
            this.Ground[0] = new Pin(this, "GND", "12");

            this.E1n = new Pin(this, "E1n", "18", LineMode.In, SignalState.L, NetE1n);
            this.E2n = new Pin(this, "E2n", "19", LineMode.In, SignalState.L, NetE2n);

            this.A0 = new Pin(this, "A0", "23", LineMode.In, SignalState.L, NetA0);
            this.A1 = new Pin(this, "A1", "22", LineMode.In, SignalState.L, NetA1);
            this.A2 = new Pin(this, "A2", "21", LineMode.In, SignalState.L, NetA2);
            this.A3 = new Pin(this, "A3", "20", LineMode.In, SignalState.L, NetA3);

            this.Y0 = new Pin(this, "Y0", "1", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            this.Y1 = new Pin(this, "Y1", "2", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            this.Y2 = new Pin(this, "Y2", "3", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            this.Y3 = new Pin(this, "Y3", "4", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            this.Y4 = new Pin(this, "Y4", "5", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            this.Y5 = new Pin(this, "Y5", "6", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            this.Y6 = new Pin(this, "Y6", "7", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            this.Y7 = new Pin(this, "Y7", "8", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);

            this.Y8 = new Pin(this,   "Y8",  "9", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            this.Y9 = new Pin(this,   "Y9", "10", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            this.Y10 = new Pin(this, "Y10", "11", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            this.Y11 = new Pin(this, "Y11", "13", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            this.Y12 = new Pin(this, "Y12", "14", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            this.Y13 = new Pin(this, "Y13", "15", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            this.Y14 = new Pin(this, "Y14", "16", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            this.Y15 = new Pin(this, "Y15", "17", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[2][];
            SetPinArray(Inputs, 0, new Pin[] { this.E1n, this.E2n });
            A = new Pin[] { this.A0, this.A1, this.A2, this.A3 };
            SetPinArray(Inputs, 1, A);

            Outputs = new Pin[16][];
            SetPinArray(Outputs, 0, this.Y0);
            SetPinArray(Outputs, 1, this.Y1);
            SetPinArray(Outputs, 2, this.Y2);
            SetPinArray(Outputs, 3, this.Y3);
            SetPinArray(Outputs, 4, this.Y4);
            SetPinArray(Outputs, 5, this.Y5);
            SetPinArray(Outputs, 6, this.Y6);
            SetPinArray(Outputs, 7, this.Y7);
            SetPinArray(Outputs, 8, this.Y8);
            SetPinArray(Outputs, 9, this.Y9);
            SetPinArray(Outputs, 10, this.Y10);
            SetPinArray(Outputs, 11, this.Y11);
            SetPinArray(Outputs, 12, this.Y12);
            SetPinArray(Outputs, 13, this.Y13);
            SetPinArray(Outputs, 14, this.Y14);
            SetPinArray(Outputs, 15, this.Y15);
        }
        #endregion Constructors

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);

            if ((E1n.State == SignalState.L) && (E2n.State == SignalState.L))
            {
                int a = GetValue(A);
                switch (a)
                {
                    case 0:
                        Y0.NewOutState = SignalState.L;
                        Y1.NewOutState = SignalState.H;
                        Y2.NewOutState = SignalState.H;
                        Y3.NewOutState = SignalState.H;
                        Y4.NewOutState = SignalState.H;
                        Y5.NewOutState = SignalState.H;
                        Y6.NewOutState = SignalState.H;
                        Y7.NewOutState = SignalState.H;
                        Y8.NewOutState = SignalState.H;
                        Y9.NewOutState = SignalState.H;
                        Y10.NewOutState = SignalState.H;
                        Y11.NewOutState = SignalState.H;
                        Y12.NewOutState = SignalState.H;
                        Y13.NewOutState = SignalState.H;
                        Y14.NewOutState = SignalState.H;
                        Y15.NewOutState = SignalState.H;
                        break;

                    case 1:
                        Y0.NewOutState = SignalState.H;
                        Y1.NewOutState = SignalState.L;
                        Y2.NewOutState = SignalState.H;
                        Y3.NewOutState = SignalState.H;
                        Y4.NewOutState = SignalState.H;
                        Y5.NewOutState = SignalState.H;
                        Y6.NewOutState = SignalState.H;
                        Y7.NewOutState = SignalState.H;
                        Y8.NewOutState = SignalState.H;
                        Y9.NewOutState = SignalState.H;
                        Y10.NewOutState = SignalState.H;
                        Y11.NewOutState = SignalState.H;
                        Y12.NewOutState = SignalState.H;
                        Y13.NewOutState = SignalState.H;
                        Y14.NewOutState = SignalState.H;
                        Y15.NewOutState = SignalState.H;
                        break;

                    case 2:
                        Y0.NewOutState = SignalState.H;
                        Y1.NewOutState = SignalState.H;
                        Y2.NewOutState = SignalState.L;
                        Y3.NewOutState = SignalState.H;
                        Y4.NewOutState = SignalState.H;
                        Y5.NewOutState = SignalState.H;
                        Y6.NewOutState = SignalState.H;
                        Y7.NewOutState = SignalState.H;
                        Y8.NewOutState = SignalState.H;
                        Y9.NewOutState = SignalState.H;
                        Y10.NewOutState = SignalState.H;
                        Y11.NewOutState = SignalState.H;
                        Y12.NewOutState = SignalState.H;
                        Y13.NewOutState = SignalState.H;
                        Y14.NewOutState = SignalState.H;
                        Y15.NewOutState = SignalState.H;
                        break;

                    case 3:
                        Y0.NewOutState = SignalState.H;
                        Y1.NewOutState = SignalState.H;
                        Y2.NewOutState = SignalState.H;
                        Y3.NewOutState = SignalState.L;
                        Y4.NewOutState = SignalState.H;
                        Y5.NewOutState = SignalState.H;
                        Y6.NewOutState = SignalState.H;
                        Y7.NewOutState = SignalState.H;
                        Y8.NewOutState = SignalState.H;
                        Y9.NewOutState = SignalState.H;
                        Y10.NewOutState = SignalState.H;
                        Y11.NewOutState = SignalState.H;
                        Y12.NewOutState = SignalState.H;
                        Y13.NewOutState = SignalState.H;
                        Y14.NewOutState = SignalState.H;
                        Y15.NewOutState = SignalState.H;
                        break;

                    case 4:
                        Y0.NewOutState = SignalState.H;
                        Y1.NewOutState = SignalState.H;
                        Y2.NewOutState = SignalState.H;
                        Y3.NewOutState = SignalState.H;
                        Y4.NewOutState = SignalState.L;
                        Y5.NewOutState = SignalState.H;
                        Y6.NewOutState = SignalState.H;
                        Y7.NewOutState = SignalState.H;
                        Y8.NewOutState = SignalState.H;
                        Y9.NewOutState = SignalState.H;
                        Y10.NewOutState = SignalState.H;
                        Y11.NewOutState = SignalState.H;
                        Y12.NewOutState = SignalState.H;
                        Y13.NewOutState = SignalState.H;
                        Y14.NewOutState = SignalState.H;
                        Y15.NewOutState = SignalState.H;
                        break;

                    case 5:
                        Y0.NewOutState = SignalState.H;
                        Y1.NewOutState = SignalState.H;
                        Y2.NewOutState = SignalState.H;
                        Y3.NewOutState = SignalState.H;
                        Y4.NewOutState = SignalState.H;
                        Y5.NewOutState = SignalState.L;
                        Y6.NewOutState = SignalState.H;
                        Y7.NewOutState = SignalState.H;
                        Y8.NewOutState = SignalState.H;
                        Y9.NewOutState = SignalState.H;
                        Y10.NewOutState = SignalState.H;
                        Y11.NewOutState = SignalState.H;
                        Y12.NewOutState = SignalState.H;
                        Y13.NewOutState = SignalState.H;
                        Y14.NewOutState = SignalState.H;
                        Y15.NewOutState = SignalState.H;
                        break;

                    case 6:
                        Y0.NewOutState = SignalState.H;
                        Y1.NewOutState = SignalState.H;
                        Y2.NewOutState = SignalState.H;
                        Y3.NewOutState = SignalState.H;
                        Y4.NewOutState = SignalState.H;
                        Y5.NewOutState = SignalState.H;
                        Y6.NewOutState = SignalState.L;
                        Y7.NewOutState = SignalState.H;
                        Y8.NewOutState = SignalState.H;
                        Y9.NewOutState = SignalState.H;
                        Y10.NewOutState = SignalState.H;
                        Y11.NewOutState = SignalState.H;
                        Y12.NewOutState = SignalState.H;
                        Y13.NewOutState = SignalState.H;
                        Y14.NewOutState = SignalState.H;
                        Y15.NewOutState = SignalState.H;
                        break;

                    case 7:
                        Y0.NewOutState = SignalState.H;
                        Y1.NewOutState = SignalState.H;
                        Y2.NewOutState = SignalState.H;
                        Y3.NewOutState = SignalState.H;
                        Y4.NewOutState = SignalState.H;
                        Y5.NewOutState = SignalState.H;
                        Y6.NewOutState = SignalState.H;
                        Y7.NewOutState = SignalState.L;
                        Y8.NewOutState = SignalState.H;
                        Y9.NewOutState = SignalState.H;
                        Y10.NewOutState = SignalState.H;
                        Y11.NewOutState = SignalState.H;
                        Y12.NewOutState = SignalState.H;
                        Y13.NewOutState = SignalState.H;
                        Y14.NewOutState = SignalState.H;
                        Y15.NewOutState = SignalState.H;
                        break;

                    case 8:
                        Y0.NewOutState = SignalState.H;
                        Y1.NewOutState = SignalState.H;
                        Y2.NewOutState = SignalState.H;
                        Y3.NewOutState = SignalState.H;
                        Y4.NewOutState = SignalState.H;
                        Y5.NewOutState = SignalState.H;
                        Y6.NewOutState = SignalState.H;
                        Y7.NewOutState = SignalState.H;
                        Y8.NewOutState = SignalState.L;
                        Y9.NewOutState = SignalState.H;
                        Y10.NewOutState = SignalState.H;
                        Y11.NewOutState = SignalState.H;
                        Y12.NewOutState = SignalState.H;
                        Y13.NewOutState = SignalState.H;
                        Y14.NewOutState = SignalState.H;
                        Y15.NewOutState = SignalState.H;
                        break;

                    case 9:
                        Y0.NewOutState = SignalState.H;
                        Y1.NewOutState = SignalState.H;
                        Y2.NewOutState = SignalState.H;
                        Y3.NewOutState = SignalState.H;
                        Y4.NewOutState = SignalState.H;
                        Y5.NewOutState = SignalState.H;
                        Y6.NewOutState = SignalState.H;
                        Y7.NewOutState = SignalState.H;
                        Y8.NewOutState = SignalState.H;
                        Y9.NewOutState = SignalState.L;
                        Y10.NewOutState = SignalState.H;
                        Y11.NewOutState = SignalState.H;
                        Y12.NewOutState = SignalState.H;
                        Y13.NewOutState = SignalState.H;
                        Y14.NewOutState = SignalState.H;
                        Y15.NewOutState = SignalState.H;
                        break;

                    case 10:
                        Y0.NewOutState = SignalState.H;
                        Y1.NewOutState = SignalState.H;
                        Y2.NewOutState = SignalState.H;
                        Y3.NewOutState = SignalState.H;
                        Y4.NewOutState = SignalState.H;
                        Y5.NewOutState = SignalState.H;
                        Y6.NewOutState = SignalState.H;
                        Y7.NewOutState = SignalState.H;
                        Y8.NewOutState = SignalState.H;
                        Y9.NewOutState = SignalState.H;
                        Y10.NewOutState = SignalState.L;
                        Y11.NewOutState = SignalState.H;
                        Y12.NewOutState = SignalState.H;
                        Y13.NewOutState = SignalState.H;
                        Y14.NewOutState = SignalState.H;
                        Y15.NewOutState = SignalState.H;
                        break;

                    case 11:
                        Y0.NewOutState = SignalState.H;
                        Y1.NewOutState = SignalState.H;
                        Y2.NewOutState = SignalState.H;
                        Y3.NewOutState = SignalState.H;
                        Y4.NewOutState = SignalState.H;
                        Y5.NewOutState = SignalState.H;
                        Y6.NewOutState = SignalState.H;
                        Y7.NewOutState = SignalState.H;
                        Y8.NewOutState = SignalState.H;
                        Y9.NewOutState = SignalState.H;
                        Y10.NewOutState = SignalState.H;
                        Y11.NewOutState = SignalState.L;
                        Y12.NewOutState = SignalState.H;
                        Y13.NewOutState = SignalState.H;
                        Y14.NewOutState = SignalState.H;
                        Y15.NewOutState = SignalState.H;
                        break;

                    case 12:
                        Y0.NewOutState = SignalState.H;
                        Y1.NewOutState = SignalState.H;
                        Y2.NewOutState = SignalState.H;
                        Y3.NewOutState = SignalState.H;
                        Y4.NewOutState = SignalState.H;
                        Y5.NewOutState = SignalState.H;
                        Y6.NewOutState = SignalState.H;
                        Y7.NewOutState = SignalState.H;
                        Y8.NewOutState = SignalState.H;
                        Y9.NewOutState = SignalState.H;
                        Y10.NewOutState = SignalState.H;
                        Y11.NewOutState = SignalState.H;
                        Y12.NewOutState = SignalState.L;
                        Y13.NewOutState = SignalState.H;
                        Y14.NewOutState = SignalState.H;
                        Y15.NewOutState = SignalState.H;
                        break;

                    case 13:
                        Y0.NewOutState = SignalState.H;
                        Y1.NewOutState = SignalState.H;
                        Y2.NewOutState = SignalState.H;
                        Y3.NewOutState = SignalState.H;
                        Y4.NewOutState = SignalState.H;
                        Y5.NewOutState = SignalState.H;
                        Y6.NewOutState = SignalState.H;
                        Y7.NewOutState = SignalState.H;
                        Y8.NewOutState = SignalState.H;
                        Y9.NewOutState = SignalState.H;
                        Y10.NewOutState = SignalState.H;
                        Y11.NewOutState = SignalState.H;
                        Y12.NewOutState = SignalState.H;
                        Y13.NewOutState = SignalState.L;
                        Y14.NewOutState = SignalState.H;
                        Y15.NewOutState = SignalState.H;
                        break;

                    case 14:
                        Y0.NewOutState = SignalState.H;
                        Y1.NewOutState = SignalState.H;
                        Y2.NewOutState = SignalState.H;
                        Y3.NewOutState = SignalState.H;
                        Y4.NewOutState = SignalState.H;
                        Y5.NewOutState = SignalState.H;
                        Y6.NewOutState = SignalState.H;
                        Y7.NewOutState = SignalState.H;
                        Y8.NewOutState = SignalState.H;
                        Y9.NewOutState = SignalState.H;
                        Y10.NewOutState = SignalState.H;
                        Y11.NewOutState = SignalState.H;
                        Y12.NewOutState = SignalState.H;
                        Y13.NewOutState = SignalState.H;
                        Y14.NewOutState = SignalState.L;
                        Y15.NewOutState = SignalState.H;
                        break;

                    case 15:
                        Y0.NewOutState = SignalState.H;
                        Y1.NewOutState = SignalState.H;
                        Y2.NewOutState = SignalState.H;
                        Y3.NewOutState = SignalState.H;
                        Y4.NewOutState = SignalState.H;
                        Y5.NewOutState = SignalState.H;
                        Y6.NewOutState = SignalState.H;
                        Y7.NewOutState = SignalState.H;
                        Y8.NewOutState = SignalState.H;
                        Y9.NewOutState = SignalState.H;
                        Y10.NewOutState = SignalState.H;
                        Y11.NewOutState = SignalState.H;
                        Y12.NewOutState = SignalState.H;
                        Y13.NewOutState = SignalState.H;
                        Y14.NewOutState = SignalState.H;
                        Y15.NewOutState = SignalState.L;
                        break;
                }
            }
            else
            {
                Y0.NewOutState = SignalState.H;
                Y1.NewOutState = SignalState.H;
                Y2.NewOutState = SignalState.H;
                Y3.NewOutState = SignalState.H;
                Y4.NewOutState = SignalState.H;
                Y5.NewOutState = SignalState.H;
                Y6.NewOutState = SignalState.H;
                Y7.NewOutState = SignalState.H;
                Y8.NewOutState = SignalState.H;
                Y9.NewOutState = SignalState.H;
                Y10.NewOutState = SignalState.H;
                Y11.NewOutState = SignalState.H;
                Y12.NewOutState = SignalState.H;
                Y13.NewOutState = SignalState.H;
                Y14.NewOutState = SignalState.H;
                Y15.NewOutState = SignalState.H;
            }
        }
        #endregion Public Methods

    }
}
